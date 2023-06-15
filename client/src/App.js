import { PostList } from "./components/PostLists";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { PostProvider } from "./context/PostContext";
import Post from "./components/Post";


function App() {
  return (
    <div className="container">
      <Router>
        <Routes>
          <Route exact path='/' element={<PostList />} />
          <Route exact path='/posts/:id' element={
            <PostProvider>
              <Post/>
            </PostProvider>
          } />
        </Routes>
      </Router>
    </div>
  )
}

export default App;
