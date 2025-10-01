module.exports = {
  "apps": [
    {
      "name": "dashboard-api-proxy",
      "script": "./dashboard_api_proxy.js",
      "cwd": "/home/u191176295/domains/giftedworld.org/public_html/api-proxy",
      "instances": 1,
      "exec_mode": "fork",
      "watch": false,
      "env": {
        "NODE_ENV": "production",
        "PORT": 3002
      },
      "error_file": "./logs/api-proxy-error.log",
      "out_file": "./logs/api-proxy-out.log",
      "log_file": "./logs/api-proxy-combined.log",
      "time": true,
      "restart_delay": 4000,
      "max_restarts": 10
    }
  ]
};