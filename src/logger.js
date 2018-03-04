const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

const myFormat = printf(info => {
  return `${info.timestamp} ${info.level}: ${info.message}`;
});

const log = createLogger({
  transports: [
    new transports.Console({
      level: 'verbose',
      format: combine(
        timestamp(),
        myFormat
      )
    }),
    new transports.File({
      filename: 'logs/combined.log',
      level: 'verbose'
    }),
    new transports.File({
      filename: 'logs/errors.log',
      level: 'error'
    })
  ]
});

module.exports = log;
