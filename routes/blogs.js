import express from "express";
import db from "../db.js";
import { authenticateToken } from "../middleware/middleware.js";

const router = express.Router();

router.get("/your-blogs", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;
    const blogUpdated = req.query.blogUpdated;
    let blogs;
    let totalPages;

    try {
        const countResult = await db.query(
            `SELECT COUNT(*) AS total FROM posts WHERE author_id = $1`,
            [userId]
        );
        const total = parseInt(countResult.rows[0].total);
        totalPages = Math.ceil(total / limit);

        const result = await db.query(
            `SELECT posts.id, posts.title, posts.content, posts.created_at,
              users.username AS author
       FROM posts
       JOIN users ON posts.author_id = users.id
       WHERE posts.author_id = $1
       ORDER BY posts.created_at DESC
       LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        blogs = result.rows.map(row => ({
            id: row.id,
            title: row.title,
            shortContent: row.content.slice(0, 150) + (row.content.length > 150 ? "…" : ""),
            author: row.author,
            datePosted: row.created_at
        }));

        if (!blogUpdated) {
            return res.render("blogs/yourBlogs.ejs", {
                user: req.user,
                blogs,
                currentPage: page,
                totalPages
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading your blogs");
    }

    if (blogUpdated) {
        return res.render("blogs/yourBlogs.ejs", {
            user: req.user,
            blogs,
            currentPage: page,
            totalPages,
            updatedBlog: true,
        });
    }

});


router.get('/blogs', authenticateToken, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 5; // poste për faqe
    const offset = (page - 1) * limit;

    try {
        const countResult = await db.query('SELECT COUNT(*) AS total FROM posts');
        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);

        const result = await db.query(
            `SELECT posts.id, posts.title, posts.content, posts.created_at,
              users.username AS author
       FROM posts
       JOIN users ON posts.author_id = users.id
       ORDER BY posts.created_at DESC
       LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        const blogs = result.rows.map(row => ({
            id: row.id,
            title: row.title,
            shortContent: row.content.slice(0, 150) + (row.content.length > 150 ? "…" : ""),
            author: row.author,
            datePosted: row.created_at
        }));

        res.render('blogs/allBlogs.ejs', {
            user: req.user,
            blogs,
            currentPage: page,
            totalPages
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


router.get("/edit-post/:id", authenticateToken, async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;

    try {
        const result = await db.query(
            `SELECT id, title, content, author_id 
       FROM posts 
       WHERE id = $1 AND author_id = $2`,
            [postId, userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).send("Post not found or not authorized");
        }
        const post = result.rows[0];
        res.render("blogs/editBlog.ejs", { user: req.user, post });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading post");
    }
});


router.post("/edit-post/:id", authenticateToken, async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;
    const { title, content } = req.body;

    try {
        const result = await db.query(
            `UPDATE posts 
       SET title = $1, content = $2, updated_at = NOW() 
       WHERE id = $3 AND author_id = $4`,
            [title, content, postId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).send("Post not found or not authorized");
        }
        res.redirect("/your-blogs?blogUpdated=true");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating post");
    }
});


router.get("/blog/:id", authenticateToken, async (req, res) => {
    const postId = req.params.id;

    try {
        const result = await db.query(
            `SELECT p.id, p.title, p.content, p.created_at, p.updated_at, 
                u.username AS author, p.author_id
            FROM posts p
            JOIN users u ON p.author_id = u.id
            WHERE p.id = $1`,
            [postId]
        );


        if (result.rows.length === 0) {
            return res.status(404).send("Post not found");
        }

        const post = result.rows[0];
        console.log(post)
        res.render("blogs/blogDetail.ejs", {
            user: req.user,
            post
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading blog detail");
    }
});


export default router;