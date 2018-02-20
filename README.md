<p align="center">
  <img src="./public/img/rocto-icon.png" width="15%"></img>
  <h1 align="center">rocto-server</h1>
  <p align="center">
    <a href="https://travis-ci.org/roctoproject/rocto-server"><img src="https://travis-ci.org/roctoproject/rocto-server.svg?branch=master"></a>
    </a>
  </p>
</p>
<br/>

## How to build & run

1. Install [`node.js`](https://nodejs.org/en/download/).
2. `git clone https://github.com/roctoproject/rocto-server.git`
3. Open repo in terminal/shell.
4. Set up the necessary node modules: `npm install`
5. Fill out `ip-address` and `port` (and any other configuration) in `config.json`.
6. `npm test` or `npm run init-db`
7. OPTIONAL: `npm run read-db` to read the current contents of the database
8. Run the server: `npm start`
9. The server is now running on the port you specified

## PM2 support
We can also run the server in cluster mode where automatically load-balances. For this we need `pm2`. Other advantages are daemonisation and auto-restart. See [pm2](https://github.com/Unitech/pm2).

1. `npm install -g pm2`
2. `pm2 start rocto.js --name rocto -i max`
3. `pm2 monit`
