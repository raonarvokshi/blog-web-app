import express from "express";
import { authenticateToken } from "../middleware/middleware.js";
import db from "../db.js";

const router = express.Router();

router.get("/add-new-post", authenticateToken, (req, res) => {
    res.render("blogs/addPost.ejs", { user: req.user });
});

router.post("/add-new-post", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { title, content } = req.body;
    try {
        await db.query("INSERT INTO posts (title, content, author_id) VALUES ($1, $2, $3)",
            [title, content, userId]
        );
        res.redirect("/?blogPosted=true");
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

export default router;