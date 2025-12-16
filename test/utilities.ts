import { packageDirectorySync } from 'package-directory'

export const projectRoot = packageDirectorySync()!
