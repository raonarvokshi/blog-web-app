import jwt from "jsonwebtoken";
import JWT_SECRET from "../index.js";

// Middleware për verifikim JWT
export function authenticateToken(req, res, next) {
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


export function verifyToken(req, res, next) {
    const token = req.cookies.token;
    jwt.verify(token, JWT_SECRET, (err, user) => {
        req.user = user;
        next();
    })
}