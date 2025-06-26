import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "blog",
    password: "raonar",
    port: "5432"
});
db.connect();

const app = express();
const port = 3000;
const JWT_SECRET = "SECRET_KEY";

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("view engine", "ejs");

// Middleware për verifikim JWT
function authenticateToken(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.redirect("/login?notAuthenticated=true");
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.redirect("/login?notAuthenticated=true");
        }

        req.user = user;
        next();
    });
}


function verifyToken(req, res, next) {
    const token = req.cookies.token;
    jwt.verify(token, JWT_SECRET, (err, user) => {
        req.user = user;
        next();
    })
}


app.get("/", verifyToken, (req, res) => {
    res.render("home.ejs", { user: req.user });
});


app.get("/login", (req, res) => {
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


app.post("/login", async (req, res) => {
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


app.get("/register", (req, res) => {
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


app.post("/register", async (req, res) => {
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


app.get("/profile", authenticateToken, (req, res) => {
    const updated = req.query.updated;

    if (updated) {
        return res.render("profile/profile.ejs", { user: req.user, success: "Profile updated successfully!" });
    }

    res.render("profile/profile.ejs", { user: req.user });
});

app.post("/profile", authenticateToken, async (req, res) => {
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


app.get("/profile/change-password", authenticateToken, (req, res) => {
    res.render("profile/changePass.ejs", { user: req.user });
});

app.post("/profile/change-password", authenticateToken, async (req, res) => {
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


app.get("/profile/delete-account", authenticateToken, (req, res) => {
    res.render("profile/deleteAcc.ejs", { user: req.user });
});

app.post("/profile/delete-account", authenticateToken, async (req, res) => {
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


app.get("/add-new-post", authenticateToken, (req, res) => {
    res.render("blogs/addPost.ejs", { user: req.user });
});

app.get("/logout", (req, res) => {
    try {
        res.clearCookie("token");
        res.redirect("/login");
    } catch (err) {
        console.error("Error on logout:", err);
        res.status(500).send("Error while logging out");
    }
});


app.listen(port, () => {
    console.log("http://localhost:3000/");
});
