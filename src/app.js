import express from 'express';
import helmet from 'helmet';
import xss from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import cors from 'cors';
import passport from 'passport';
import httpStatus from 'http-status';
import config from './config/config.js';
import * as morgan from './config/morgan.js';
import { jwtStrategy } from './config/passport.js';
import { authLimiter } from './middlewares/rateLimiter.js';
import routes from './routes/v1/index.js';
import { errorConverter, errorHandler } from './middlewares/error.js';
import ApiError from './utils/ApiError.js';


const app = express();

if (config.env !== 'test') {
    app.use(morgan.successHandler);
    app.use(morgan.errorHandler);
}

// 设置安全 HTTP 头
app.use(helmet());

// 解析 json 请求体
app.use(express.json());

// 解析 urlencoded 请求体
app.use(express.urlencoded({ extended: true }));

// 清理请求数据
app.use(xss());
app.use(mongoSanitize());

// gzip 压缩
app.use(compression());

// 启用 cors
app.use(cors());
app.options('*', cors());

// jwt 认证
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

// 限制对身份验证端点的重复失败请求
if (config.env === 'production') {
    app.use('/v1/auth', authLimiter);
}

// v1 api 路由
app.use('/v1', routes);

// 将 404 错误发送回任何未知的 api 请求
app.use((req, res, next) => {
    next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// 将错误转换为 ApiError（如果需要）
app.use(errorConverter);

// 处理错误
app.use(errorHandler);

export default app;
