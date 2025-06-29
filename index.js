import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import profile from "./routes/profile.js";
import auth from "./routes/auth.js";
import posts from "./routes/posts.js";
import blogs from "./routes/blogs.js";
import { verifyToken } from "./middleware/middleware.js";


dotenv.config();
const app = express();
const port = process.env.SERVER_PORT;
const JWT_SECRET = process.env.SECRET_KEY;
export default JWT_SECRET;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("view engine", "ejs");
app.use(profile);
app.use(auth);
app.use(posts);
app.use(blogs);

app.get("/", verifyToken, (req, res) => {
    const blogPosted = req.query.blogPosted;
    const blogDeleted = req.query.blogDeleted;
    if (blogPosted) {
        return res.render("home.ejs", { user: req.user, blogPosted: "Your blog was posted successfully!" });
    }

    if (blogDeleted) {
        return res.render("home.ejs", { user: req.user, blogDeleted: "Your blog was deleted successfully!" });
    }
    res.render("home.ejs", { user: req.user });
});


app.listen(port, () => {
    console.log("http://localhost:3000/");
});
