import { debugEnabled } from '../config';
import LogService from '../services/LogService';

export const descriptorMiddleware = (req, res, next) => {
  delete req.body.descriptor;

  next();
};

export const validationMiddleware = (err, req, res, _next) => {
  console.log(req.body);

  if (debugEnabled) {
    if (err.status === 500) LogService.red(`Fatal error: ${err.message}`);
    else LogService.yellow(`validation error: ${err.message}`);
  }
  res.status(err.status || 500).json({
    message: err.message,
    errors: err.errors
  });
};
