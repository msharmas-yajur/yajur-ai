module.exports = {
    apps: [
        {
            name: "yajur-copilot-backend",
            script: "npm",
            args: "start",
            cwd: "/home/msharma/yajur_ai/copilot/backend",
            env: {
                NODE_ENV: "production",
            },
            log_date_format: "YYYY-MM-DD HH:mm:ss",
            error_file: "logs/err.log",
            out_file: "logs/out.log",
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
        },
    ],
};
