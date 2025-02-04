/*
 * Copyright (c) 2014-2023 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import fs = require('fs')
import { type Request, type Response, type NextFunction } from 'express'
import { UserModel } from '../models/user'
import logger from '../lib/logger'

import * as utils from '../lib/utils'
const security = require('../lib/insecurity')
const fileType = require('file-type')

module.exports = function fileUpload() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const file = req.file
    const buffer = file?.buffer
    const uploadedFileType = await fileType.fromBuffer(buffer)



    const loggedInUser = security.authenticatedUsers.get(req.cookies.token)
    if (loggedInUser) {
      // Vulnerability 1: Path Traversal
      fs.open(`frontend/dist/frontend/assets/public/images/uploads/${loggedInUser.data.id}.${uploadedFileType.ext}`, 'w', function (err, fd) {
        if (err != null) logger.warn('Error opening file: ' + err.message)
        // @ts-expect-error FIXME buffer has unexpected type
        fs.write(fd, buffer, 0, buffer.length, null, function (err) {
          if (err != null) logger.warn('Error writing file: ' + err.message)
          fs.close(fd, function () { })
        })
      })
      UserModel.findByPk(loggedInUser.data.id).then(async (user: UserModel | null) => {
        if (user != null) {
          return await user.update({ profileImage: `assets/public/images/uploads/${loggedInUser.data.id}.${uploadedFileType.ext}` })
        }
      }).catch((error: Error) => {
        console.log(error.message);
        next(error)
      })
      // Vulnerability 2: Incomplete Error Handling
      res.location(process.env.BASE_PATH + '/profile')
      res.redirect(process.env.BASE_PATH + '/profile')
    } else {
      next(new Error('Blocked illegal activity by ' + req.socket.remoteAddress))
    }
  }


}