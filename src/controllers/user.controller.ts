// src/controllers/user.controller.ts
import { Request, Response, NextFunction } from "express"
import { UserService } from "../services/user.service"
import cloudinary from "../config/cloudinary"
import streamifier from "streamifier"
import { AppError } from "../utils/error"
import { BAD_REQUEST } from "../utils/http-status"

async function uploadAvatarBuffer(buffer: Buffer) {
  return new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "avatars", resource_type: "image" },
      (err, val) => (err ? reject(err) : resolve(val))
    )
    streamifier.createReadStream(buffer).pipe(stream)
  })
}

export class UserController {
  // Public: GET /users/:id/public
  static async getPublicProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params
      const user = await UserService.getById(id)
      if (!user) {
        res.sendStatus(404)
        return
      }
      res.json({ id: user.id, name: user.name, avatar: user.avatar })
    } catch (err) {
      next(err)
    }
  }

  // Authenticated: GET /users/me
  static async getSelf(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user.id
      const user = await UserService.getById(userId)
      if (!user) {
        res.sendStatus(404)
        return
      }
      res.json(user)
    } catch (err) {
      next(err)
    }
  }

  // Authenticated: PUT /users/me
  static async updateSelf(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user.id
      const updated = await UserService.updateSelf(userId, req.body)
      if (!updated) {
        res.sendStatus(404)
        return
      }
      res.json(updated)
    } catch (err) {
      next(err)
    }
  }

  // Authenticated: DELETE /users/me
  static async deleteSelf(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user.id
      await UserService.deleteSelf(userId)
      res.sendStatus(204)
    } catch (err) {
      next(err)
    }
  }

  // Authenticated: PATCH /users/me/avatar
  static async uploadAvatar(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user.id
      const file = (req as any).file as Express.Multer.File | undefined
      if (!file) {
        res.status(400).json({ error: "No file uploaded" })
        return
      }
      const result = await uploadAvatarBuffer(file.buffer)
      const updated = await UserService.updateSelf(userId, {
        avatar: result.secure_url,
      })
      if (!updated) {
        res.sendStatus(404)
        return
      }
      res.json({ url: result.secure_url, public_id: result.public_id })
    } catch (err) {
      next(err)
    }
  }

  // ── Admin-only ─────────────────────────────────────────────

  // POST /users
  static async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // body: { email, password, name, role?, avatar? }
      const newUser = await UserService.create(req.body)
      // strip out password hash
      const userObj = newUser.toObject()
      delete userObj.password
      res.status(201).json(userObj)
    } catch (err) {
      next(err)
    }
  }

  // GET /users
  static async getAll(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const users = await UserService.getAll()
      res.json(users)
    } catch (err) {
      next(err)
    }
  }

  // GET /users/:id
  static async getById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await UserService.getById(req.params.id)
      if (!user) {
        res.sendStatus(404)
        return
      }
      res.json(user)
    } catch (err) {
      next(err)
    }
  }

  // PUT /users/:id
  static async update(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const updated = await UserService.update(req.params.id, req.body)
      if (!updated) {
        res.sendStatus(404)
        return
      }
      res.json(updated)
    } catch (err) {
      next(err)
    }
  }

  // DELETE /users/:id
  static async delete(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await UserService.delete(req.params.id)
      res.sendStatus(204)
    } catch (err) {
      next(err)
    }
  }

  // PATCH /users/:id/avatar
  static async uploadAvatarAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const file = (req as any).file as Express.Multer.File | undefined
      if (!file) {
        res.status(400).json({ error: "No file uploaded" })
        return
      }
      const result = await uploadAvatarBuffer(file.buffer)
      const updated = await UserService.update(req.params.id, {
        avatar: result.secure_url,
      })
      if (!updated) {
        res.sendStatus(404)
        return
      }
      res.json({ url: result.secure_url, public_id: result.public_id })
    } catch (err) {
      next(err)
    }
  }
}
