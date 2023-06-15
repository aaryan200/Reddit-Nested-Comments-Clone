import { makeRequest } from "./makeRequest";

// all api requests will be made here
export function getPosts() {
    return makeRequest("posts/");
}

export function getPost(id) {
    return makeRequest(`post/${id}/`);
}