import { NextFunction, Request, Response } from "express";

export const isAuthenticated = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const isLoggedIn = req.isAuthenticated() && req.user;
    if (!isLoggedIn) {
        return res.status(401).json({
            msg: "You must Loggin",
        });
    }
    next();
};
