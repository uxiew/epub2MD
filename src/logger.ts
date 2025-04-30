import pc from 'picocolors'

/**
 * 统一的日志管理模块
 * 集中处理所有控制台输出和颜色处理
 */
export const name = 'epub2md'

/**
 * 日志级别枚举
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    SUCCESS = 2,
    WARN = 3,
    ERROR = 4,
}

// 当前日志级别，可以通过环境变量或配置文件设置
let currentLogLevel = LogLevel.INFO

/**
 * 设置日志级别
 * @param level 日志级别
 */
export function setLogLevel(level: LogLevel): void {
    currentLogLevel = level
}

/**
 * 格式化日志消息
 * @param message 消息内容
 */
function formatMessage(message: string): string {
    return `[${name}]: ${message}`
}

/**
 * 调试日志
 * @param message 消息内容
 * @param args 额外参数
 */
export function debug(message: string, ...args: any[]): void {
    if (currentLogLevel <= LogLevel.DEBUG) {
        console.log(pc.gray(formatMessage(message)), ...args)
    }
}

/**
 * 信息日志
 * @param message 消息内容
 * @param args 额外参数
 */
export function info(message: string, ...args: any[]): void {
    if (currentLogLevel <= LogLevel.INFO) {
        console.log(pc.blue(formatMessage(message)), ...args)
    }
}

/**
 * 成功日志
 * @param message 消息内容
 * @param args 额外参数
 */
export function success(message: string, ...args: any[]): void {
    if (currentLogLevel <= LogLevel.SUCCESS) {
        console.log(pc.green(formatMessage(message)), ...args)
    }
}

/**
 * 警告日志
 * @param message 消息内容
 * @param args 额外参数
 */
export function warn(message: string, ...args: any[]): void {
    if (currentLogLevel <= LogLevel.WARN) {
        console.log(pc.yellow(formatMessage(message)), ...args)
    }
}

/**
 * 错误日志
 * @param message 消息内容
 * @param args 额外参数
 */
export function error(message: string, ...args: any[]): void {
    if (currentLogLevel <= LogLevel.ERROR) {
        console.log(pc.red(formatMessage(message)), ...args)
    }
}

/**
 * 输出JSON格式数据
 * @param data 要输出的数据
 */
export function json(data: any): void {
    try {
        const { json: beautyJson } = require('beauty-json')
        beautyJson.log(data)
    } catch (e) {
        console.log(data)
    }
}

// 导出默认对象，包含所有日志函数
export default {
    debug,
    info,
    success,
    warn,
    error,
    json,
    setLogLevel,
}