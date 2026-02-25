'use strict';

const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const config = require('../config/config');

const { combine, timestamp, printf, colorize, errors } = format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}] ${stack || message}`;
});

const logger = createLogger({
  level: config.log.level,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat,
  ),
  transports: [
    // Console avec couleurs
    new transports.Console({
      format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
    }),
    // Fichier tournant quotidiennement
    new DailyRotateFile({
      dirname:       path.join(process.cwd(), 'logs'),
      filename:      'bot-%DATE%.log',
      datePattern:   'YYYY-MM-DD',
      maxFiles:      '14d',
      zippedArchive: true,
    }),
    // Fichier dédié aux erreurs
    new DailyRotateFile({
      dirname:   path.join(process.cwd(), 'logs'),
      filename:  'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level:     'error',
      maxFiles:  '30d',
    }),
  ],
});

module.exports = logger;
