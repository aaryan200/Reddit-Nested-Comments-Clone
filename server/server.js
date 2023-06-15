// instead of express, fastify is used
// fastify/cookie for user authentication
// @fastify/cors for communication between client and server
import fastify from "fastify";
import dotenv from "dotenv";
import { PrismaClient } from '@prisma/client';
// sensible used for good error handling
import sensible from "@fastify/sensible";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
dotenv.config();

const app = fastify();
app.register(sensible);
app.register(cookie, { secret: process.env.COOKIE_SECRET });
app.register(cors, {
    origin: process.env.CLIENT_URL,
    credentials: true
});

app.addHook("onRequest", (req, res, done) => {
    if (req.cookies.userId !== CURRENT_USER_ID) {
        req.cookies.userId = CURRENT_USER_ID;
        res.clearCookie("userId");
        res.setCookie("userId", CURRENT_USER_ID);
    }
    done();
})

const prisma = new PrismaClient();
const CURRENT_USER_ID = (
    await prisma.user.findFirst({ where: { name: "Aaryan" } })
).id;

// the last backslash is important in below url
app.get("/posts/", async (req, res) => {
    return await commitToDb(prisma.post.findMany({
        select: {
            id: true,
            title: true,
        },
    }));
});

const COMMENT_SELECT_FIELDS = {
    id: true,
    message: true,
    parentId: true,
    createdAt: true,
    user: {
        select: {
            id: true,
            name: true,
        },
    },
}

app.get("/post/:id/", async (req, res) => {
    return await commitToDb(
        prisma.post
            .findUnique({
                where: { id: req.params.id },
                select: {
                    body: true,
                    title: true,
                    comments: {
                        orderBy: {
                            createdAt: "desc",
                        },
                        select: {
                            ...COMMENT_SELECT_FIELDS,
                            _count: { select: { likes: true } },
                        },
                    }
                }
            }).then(async post => {
                const likes = await prisma.like.findMany({
                    where: {
                        userId: req.cookies.userId,
                        commentId: {
                            in: post.comments.map(comment => comment.id)
                        }
                    }
                })

                return {
                    ...post,
                    comments: post.comments.map(comment => {
                        const { _count, ...commentFields } = comment
                        return {
                            ...commentFields,
                            likedByMe: likes.find(like => like.commentId === comment.id),
                            likeCount: _count.likes
                        }
                    })
                }
            })
    );
});

app.post("/post/:id/comments/", async (req, res) => {
    if (req.body.message == "" || req.body.message == null) {
        return res.send(app.httpErrors.badRequest("Message is required"));
    }

    return await commitToDb(
        prisma.comment.create({
            data: {
                message: req.body.message,
                userId: req.cookies.userId,
                parentId: req.body.parentId,
                postId: req.params.id
            },
            select: COMMENT_SELECT_FIELDS
        }).then(comment => {
            return {
                ...comment,
                likeCount: 0,
                likedByMe: false
            }
        })
    )
})


app.put("/post/:postId/comments/:commentId/", async (req, res) => {
    if (req.body.message == "" || req.body.message == null) {
        return res.send(app.httpErrors.badRequest("Message is required"));
    }

    const { userId } = await prisma.comment.findUnique({
        where: { id: req.params.commentId },
        select: { userId: true }
    })
    if (userId !== req.cookies.userId) {
        return res.send(app.httpErrors.unauthorized("Permission denied"));
    }

    return await commitToDb(
        prisma.comment.update({
            where: { id: req.params.commentId },
            data: { message: req.body.message },
            select: { message: true },
        })
    )
})

app.delete("/post/:postId/comments/:commentId/", async (req, res) => {

    const { userId } = await prisma.comment.findUnique({
        where: { id: req.params.commentId },
        select: { userId: true }
    })
    if (userId !== req.cookies.userId) {
        return res.send(app.httpErrors.unauthorized("Permission denied"));
    }

    return await commitToDb(
        prisma.comment.delete({
            where: { id: req.params.commentId },
            select: { id: true },
        })
    )
})

app.post("/post/:postId/comments/:commentId/toggleLike/", async (req, res) => {
    const data = {
        commentId: req.params.commentId,
        userId: req.cookies.userId
    }
    // userId_commentId refers to a composite field in the database that combines the userId and commentId values into a single unique identifier
    const like = await prisma.like.findUnique({
        where: { userId_commentId: data }
    })

    if (like == null) {
        // If it was not liked by the user
        return await commitToDb(prisma.like.create({ data })).then(() => {
            return { addLike: true }
        })
    }
    else {
        // If it was liked by the user
        return await commitToDb(prisma.like.delete({ where: { userId_commentId: data } }).then(() => {
            return { addLike: false }
        }))
    }
})

async function commitToDb(promise) {
    const [error, data] = await app.to(promise);
    if (error) return app.httpErrors.internalServerError(error.message);
    return data;
}

app.listen({ port: process.env.PORT });
console.log("SERVER IS RUNNING");

