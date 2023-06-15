import { useState } from "react";
import { usePost } from "../context/PostContext";
import { CommentList } from "./CommentList";
import { IconBtn } from "./IconBtn";
import { FaEdit, FaHeart, FaRegHeart, FaReply, FaTrash } from "react-icons/fa";
import { CommentForm } from "./CommentForm";
import { useAsyncFn } from "../hooks/useAsync";
import { createComment, deleteComment, toggleCommentLike, updateComment } from "../services/comments";
import { useUser } from "../hooks/useUser";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
})

export function Comment({ id, message, user, createdAt, likeCount, likedByMe }) {
    const { post, getReplies, createLocalComment, updateLocalComment, deleteLocalComment, toggleLocalCommentLike } = usePost();
    const createCommentFn = useAsyncFn(createComment);
    const updateCommentFn = useAsyncFn(updateComment);
    const deleteCommentFn = useAsyncFn(deleteComment);
    const toggleCommentLikeFn = useAsyncFn(toggleCommentLike);
    const childComments = getReplies(id);
    const currentUser = useUser();
    // console.log(currentUser);
    // console.log(user.id);

    const [areChildrenHidden, setAreChildrenHidden] = useState(false);
    const [isReplying, setIsReplying] = useState(false);
    const [editing, setEditing] = useState(false);

    function onCommentReply(message) {
        return createCommentFn.execute({ postId: post.id, message, parentId: id })
            .then(comment => {
                setIsReplying(false);
                createLocalComment(comment);
            }
            )
            .catch((err) => console.log(err));
    }

    function onCommentUpdate(message) {
        return updateCommentFn.execute({ postId: post.id, message, id })
            .then(comment => {
                setEditing(false);
                // console.log(comment);
                updateLocalComment({ id, message: comment.message });
            }
            )
            .catch((err) => console.log(err));
    }

    function onCommentDelete() {
        return deleteCommentFn.execute({ postId: post.id, id })
            .then((comment) => {
                deleteLocalComment(comment.id);
            }
            )
            .catch((err) => console.log(err));
    }

    function onToggleCommentLike() {
        return toggleCommentLikeFn.execute({id, postId: post.id}).then(({addLike}) => toggleLocalCommentLike(id, addLike));
    }

    return (
        <>
            <div className="comment">
                <div className="header">
                    <span className="name">{user.name}</span>
                    <span className="date">{dateFormatter.format(Date.parse(createdAt))}</span>
                </div>
                {editing ? <CommentForm autoFocus initialValue={message} onSubmit={onCommentUpdate}
                    loading={updateCommentFn.loading}
                    error={updateCommentFn.error}
                /> :
                    (
                        <div className="message">{message}</div>
                    )
                }
                <div className="footer">
                    <IconBtn Icon={likedByMe ? FaHeart : FaRegHeart}
                        aria-label={likedByMe ? "Like" : "Unlike"}
                        onClick={onToggleCommentLike}
                        disabled={toggleCommentLikeFn.loading}
                        >
                        {likeCount}
                    </IconBtn>
                    <IconBtn Icon={FaReply}
                        onClick={() => setIsReplying(prev => !prev)}
                        isActive={isReplying}
                        aria-label={isReplying ? "Cancel Reply" : "Reply"} />
                    {user.id == currentUser.id && (
                        <>
                            <IconBtn Icon={FaEdit}
                                onClick={() => setEditing(prev => !prev)}
                                isActive={editing}
                                aria-label={editing ? "Cancel Editing" : "Edit"}
                            />
                            <IconBtn Icon={FaTrash}
                                aria-label="Delete"
                                color="danger"
                                onClick={onCommentDelete}
                                disabled={deleteCommentFn.loading}
                            />
                        </>
                    )}
                </div>
            </div>
            {deleteCommentFn.error && (
                <div className="error-msg mt-1">{deleteCommentFn.error}</div>
            )}
            {isReplying && (
                <div className="mt-1 ml-3">
                    <CommentForm
                        autoFocus
                        onSubmit={onCommentReply}
                        loading={createCommentFn.loading}
                        error={createCommentFn.error} />
                </div>
            )}

            {childComments?.length > 0 && (
                <>
                    <div className={`nested-comments-stack ${areChildrenHidden ? "hide" : ""}`}>
                        <button aria-label="Hide Replies" className="collapse-line" onClick={() => setAreChildrenHidden(true)} />
                        <div className="nested-comments">
                            <CommentList comments={childComments} />
                        </div>
                    </div>
                    <button className={`btn mt-1 ${!areChildrenHidden ? "hide" : ""}`} onClick={() => setAreChildrenHidden(false)}>Show Replies</button>
                </>
            )}
        </>
    )
}