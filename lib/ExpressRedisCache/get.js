module.exports = (function () {
  "use strict";

  /**  Get
   *
   *  @function
   *  @description
   *  @return void
   *  @callback
   *  @arg {String} name - The cache entry name to get (wildcards accepted)
   *  @arg {Function} callback - Callback
   */

  function get(name, callback) {
    var self = this;

    var domain = require("domain").create();

    domain.on("error", function (error) {
      self.emit("error", error);
      callback(error);
      domain.exit();
    });

    domain.run(function () {
      if (typeof name === "function") {
        callback = name;
        name = "*";
      }

      var prefix = self.prefix.match(/:$/)
        ? self.prefix.replace(/:$/, "")
        : self.prefix;

      var redisKey = prefix + ":" + (name || "*");

      /** Detect wildcard syntax */
      var hasWildcard = redisKey.indexOf("*") >= 0;

      var fetchKey = function (key, cb) {
        self.readClient
          .hGetAll(key)
          .then(function (result) {
            if (result && Object.keys(result).length > 0) {
              var names = key.split(":");
              result.name = names[1];
              result.prefix = names[0];
              self.emit(
                "message",
                require("util").format(
                  "GET %s ~%d Kb",
                  key,
                  (require("../sizeof")(result) / 1024).toFixed(2)
                )
              );
            }
            cb(null, result);
          })
          .catch(function (error) {
            cb(error);
          });
      };

      /** If has wildcard */
      if (hasWildcard) {
        /** Get a list of keys using the wildcard */
        self.readClient
          .keys(prefix + ":" + name)
          .then(function (keys) {
            if (!keys.length) {
              callback(null, []);
              return domain.exit();
            }

            require("async").parallel(
              keys.map(function (key) {
                return function (cb) {
                  return fetchKey(key, cb);
                };
              }),
              domain.intercept(function (results) {
                callback(null, results);
                domain.exit();
              })
            );
          })
          .catch(function (error) {
            self.emit("error", error);
            callback(error);
            domain.exit();
          });
      } else {
        /** No wildcard **/
        fetchKey(
          redisKey,
          domain.intercept(function (result) {
            if (result && Object.keys(result).length > 0) {
              callback(null, [result]);
              domain.exit();
            } else {
              callback(null, []);
              domain.exit();
            }
          })
        );
      }
    });
  }

  return get;
})();
