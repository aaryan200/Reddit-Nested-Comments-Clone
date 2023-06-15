import React, { useContext, useEffect, useMemo, useState } from "react";
import { useAsync } from "../hooks/useAsync";
import { getPost } from "../services/posts";
import { useParams } from "react-router-dom";

const Context = React.createContext();

export function usePost() {
    return useContext(Context);
}

export function PostProvider({ children }) {
    const { id } = useParams();
    const { loading, error, value: post } = useAsync(() => getPost(id), [id]);
    const [comments, setComments] = useState([]);
    // group each of the comments into its own separate array based on parentId
    const commentsByParentId = useMemo(() => {
        const group = {};
        comments.forEach(comment => {
            // if group doesn't have any array, create an empty array
            group[comment.parentId] ||= []
            group[comment.parentId].push(comment);
        })
        return group;
    }, [comments]);

    useEffect(() => {
        if (post?.comments == null) return;
        setComments(post?.comments)
    }, [post?.comments])

    function getReplies(parentId) {
        return commentsByParentId[parentId];
    }

    function createLocalComment(comment) {
        setComments(prevComments => {
            return [comment, ...prevComments]
        })
    }

    function updateLocalComment({ id, message }) {
        setComments(prevComments => {
            return prevComments.map(comment => {
                if (comment.id === id) {
                    return { ...comment, message };
                }
                else {
                    return comment;
                }
            })
        })
    }

    function deleteLocalComment(id) {
        setComments(prevComments => {
            return prevComments.filter(comment => comment.id !== id)
        })
    }

    function toggleLocalCommentLike(id, addLike) {
        setComments(prevComments => {
            return prevComments.map(comment => {
                if (id === comment.id) {
                    if (addLike) {
                        return {
                            ...comment,
                            likeCount: comment.likeCount + 1,
                            likedByMe: true
                        }
                    }
                    else {
                        return {
                            ...comment,
                            likeCount: comment.likeCount - 1,
                            likedByMe: false
                        }
                    }
                } else {
                    return comment;
                }
            })
        })
    }

    return (
        <Context.Provider value={{
            post: { id, ...post },
            rootComments: commentsByParentId[null],
            getReplies,
            createLocalComment,
            updateLocalComment,
            deleteLocalComment,
            toggleLocalCommentLike
        }}>
            {loading ?
                (<h1>Loading</h1>) :
                error ?
                    (<h1 className="err-msg">{error}</h1>) :
                    (children)
            }
        </Context.Provider>
    )
}