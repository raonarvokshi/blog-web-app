import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { authenticateToken } from "../middleware/middleware.js";
import db from "../db.js";
import JWT_SECRET from "../index.js";

const router = express.Router();

router.get("/profile", authenticateToken, (req, res) => {
    const updated = req.query.updated;

    if (updated) {
        return res.render("profile/profile.ejs", { user: req.user, success: "Profile updated successfully!" });
    }

    res.render("profile/profile.ejs", { user: req.user });
});

router.post("/profile", authenticateToken, async (req, res) => {
    const { username, email } = req.body;
    const userId = req.user.id;

    try {
        const result = await db.query("SELECT username, email FROM users WHERE id = $1",
            [userId]);
        const current = result.rows[0];

        if (current.username !== username || current.email !== email) {
            await db.query("UPDATE users SET username = $1, email = $2 WHERE id = $3",
                [username, email, userId]
            );
            const newToken = jwt.sign({ id: userId, email: email, username: username },
                JWT_SECRET, { expiresIn: "1h" });

            res.cookie("token", newToken, {
                httpOnly: true,
                maxAge: 3600000
            });
            res.redirect("/profile?updated=true");
        }
        res.redirect("/profile");
    } catch (err) {
        console.error(err);
    }
    console.log(username, email);
});


router.get("/profile/change-password", authenticateToken, (req, res) => {
    res.render("profile/changePass.ejs", { user: req.user });
});

router.post("/profile/change-password", authenticateToken, async (req, res) => {
    const { accountPassword, newPassword, confirmNewPassword } = req.body;
    const userId = req.user.id;
    let errorMsg;

    try {
        const result = await db.query("SELECT password FROM users WHERE id = $1", [userId]);
        const user = result.rows[0];

        if (!user) {
            errorMsg = "User Not Found!";
            return res.render("profile/changePass.ejs", { user: req.user, error: errorMsg })
        }

        const isMatch = await bcrypt.compare(accountPassword, user.password);
        if (!isMatch) {
            errorMsg = "Incorrect password!"
            return res.render("profile/changePass.ejs", { user: req.user, error: errorMsg })
        }

        if (newPassword !== confirmNewPassword) {
            errorMsg = "You need to confirm your new password!"
            return res.render("profile/changePass.ejs", { user: req.user, error: errorMsg })
        }

        const newHashedPwd = await bcrypt.hash(confirmNewPassword, 10);
        await db.query("UPDATE users SET password = $1 WHERE id = $2",
            [newHashedPwd, userId]);

        const successMsg = "Password Changed Successfully";
        res.render("profile/changePass.ejs", { user: req.user, success: successMsg });

    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});


router.get("/profile/delete-account", authenticateToken, (req, res) => {
    res.render("profile/deleteAcc.ejs", { user: req.user });
});

router.post("/profile/delete-account", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { accountPassword, confirmPassword } = req.body;

    try {
        const result = await db.query("SELECT password FROM users WHERE id = $1", [userId]);
        const user = result.rows[0];

        if (!user) {
            return res.render("profile/deleteAcc.ejs", { user: req.user, error: "User not found!" })
        }

        if (accountPassword !== confirmPassword) {
            return res.render("profile/deleteAcc.ejs", { user: req.user, error: "Passwords do not match!" });
        }

        const isMatch = await bcrypt.compare(confirmPassword, user.password);
        if (!isMatch) {
            return res.render("profile/deleteAcc.ejs", { user: req.user, error: "Incorrect Password" })
        }

        await db.query("DELETE FROM users WHERE id = $1", [userId]);
        res.clearCookie("token");
        return res.redirect("/register?accountDeleted=true");

    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to delete account! please try later.")
    }
});

export default router;