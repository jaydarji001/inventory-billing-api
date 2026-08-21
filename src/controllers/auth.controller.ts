import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { query } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { RegisterInput, LoginInput } from "../validators/auth.validator";

const SALT_ROUNDS = 10;

const signToken = (payload: { id: number; email: string }) => {
  const secret = process.env.JWT_SECRET as string;
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || "1d") as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, secret, options);
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body as RegisterInput;

  const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length > 0) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name, email, passwordHash]
  );

  const user = result.rows[0];
  const token = signToken({ id: user.id, email: user.email });

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: { user, token },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginInput;

  const result = await query(
    "SELECT id, name, email, password_hash FROM users WHERE email = $1",
    [email]
  );
  const user = result.rows[0];

  // Deliberately vague error so we don't reveal whether the email exists.
  if (!user) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const token = signToken({ id: user.id, email: user.email });

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      user: { id: user.id, name: user.name, email: user.email },
      token,
    },
  });
});
