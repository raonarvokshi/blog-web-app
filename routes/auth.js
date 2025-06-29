import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import db from "../db.js";
import JWT_SECRET from "../index.js";


const router = express.Router();

router.get("/login", (req, res) => {
    const token = req.cookies.token;

    // Nëse ekziston cookie me token, përpiqume ta verifikojmë
    if (token) {
        try {
            jwt.verify(token, JWT_SECRET);
            return res.redirect("/");
        } catch (err) {
            console.error(err);
        }
    }

    const { success, notAuthenticated } = req.query;

    const messages = {
        success: "You've registered successfully. Please login to verify your credentials.",
        error: "You are not authenticated! Please login."
    };

    if (success) {
        return res.render("auth/login.ejs", { success: messages.success });
    } else if (notAuthenticated) {
        return res.render("auth/login.ejs", { error: messages.error });
    }

    res.render("auth/login.ejs");
});


router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            const storedPassword = user.password;

            bcrypt.compare(password, storedPassword, async (err, match) => {
                if (err) {
                    console.error(`Error comparing passwords: ${err}`);
                    return res.render("auth/login.ejs", { error: "Internal error" });
                }

                if (match) {
                    const token = jwt.sign(
                        { id: user.id, email: user.email, username: user.username },
                        JWT_SECRET,
                        { expiresIn: "1h" }
                    );
                    res.cookie("token", token, {
                        httpOnly: true,
                        maxAge: 3600000
                    });
                    res.redirect("/");
                } else {
                    res.render("auth/login.ejs", { error: "Password Incorrect" });
                }
            });
        } else {
            res.render("auth/login.ejs", { error: "Email Incorrect! account not found." });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});


router.get("/register", (req, res) => {
    const token = req.cookies.token;
    const accountDeleted = req.query.accountDeleted;

    if (token) {
        try {
            jwt.verify(token, JWT_SECRET);
            return res.redirect("/");
        } catch (err) {
            return res.render("auth/register.ejs");
        }
    }

    if (accountDeleted) {
        return res.render("auth/register.ejs", { accDeleted: "Your account was deleted successfully!" });
    }

    res.render("auth/register.ejs");

});


router.post("/register", async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        if (checkResult.rows.length > 0) {
            res.render("auth/register.ejs", { error: "Email already exists" });
        } else {
            bcrypt.hash(password, 10, async (err, hash) => {
                if (err) {
                    console.error(`Error hashing password ${err}`);
                    return res.render("auth/register.ejs", { error: "Error while registering" });
                }

                await db.query(
                    "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)",
                    [username, email, hash]
                );
                res.redirect("/login?success=1");
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/logout", (req, res) => {
    try {
        res.clearCookie("token");
        res.redirect("/login");
    } catch (err) {
        console.error("Error on logout:", err);
        res.status(500).send("Error while logging out");
    }
});

export default router;