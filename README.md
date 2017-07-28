<p align="center">
  <img src="https://raw.githubusercontent.com/roctoproject/rocto-server/master/rocto-icon.png" width="15%"></img>
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
5. OPTIONAL: install pm2 to use daemons: `npm install -g pm2`
6. Fill out `ip-address:port` on line 16 of `init-db.js` line 23 of `rocto.js`. 
7. `npm run init-db`
8. `npm test`
9. OPTIONAL: `npm run read-db`
10. Run the server: `npm start` OR `pm2 start rocto.js --name rocto`
11. The server is now running on port `8080`
