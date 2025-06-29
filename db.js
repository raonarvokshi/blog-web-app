import pg from "pg";

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "blog",
    password: "raonar",
    port: "5432"
});
db.connect();
export default db;