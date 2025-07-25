module.exports = (function () {
  "use strict";

  /**  Delete cache entries
   *
   *  @method ExpressRedisCache.del
   *  @description Delete entry by name
   *  @return null
   *  @arg {String} name - The entry name
   *  @arg {Function} callback
   */

  function del(name, callback) {
    var self = this;

    if (typeof name !== "string") {
      return this.emit(
        "error",
        new Error("ExpressRedisCache.del: missing first argument String")
      );
    }

    if (typeof callback !== "function") {
      return this.emit(
        "error",
        new Error("ExpressRedisCache.del: missing second argument Function")
      );
    }

    var domain = require("domain").create();

    domain.on("error", function onDelError(error) {
      callback(error);
    });

    domain.run(function delRun() {
      /** Get prefix */

      var prefix = self.prefix.match(/:$/)
        ? self.prefix.replace(/:$/, "")
        : self.prefix;

      /** Tell Redis to delete hash */

      var redisKey = prefix + ":" + name;

      /** Detect wilcard syntax */

      var hasWildcard = redisKey.indexOf("*") >= 0;

      /** If has wildcard */

      if (hasWildcard) {
        /** Get a list of keys using the wildcard */

        self.writeClientConnected
          .keys(redisKey)
          .then(function (keys) {
            require("async").each(
              keys,

              function onEachKey(key, callback) {
                self.writeClientConnected
                  .del(key)
                  .then(function () {
                    self.emit("message", require("util").format("DEL %s", key));
                    callback();
                  })
                  .catch(function (error) {
                    callback(error);
                  });
              },

              function onEachKeyDone(error) {
                if (error) {
                  throw error;
                }

                callback(null, keys.length);
              }
            );
          })
          .catch(function (error) {
            callback(error);
          });
      } else {
        /** No wildcard **/
        self.writeClientConnected
          .del(redisKey)
          .then(function (deletions) {
            self.emit("message", require("util").format("DEL %s", redisKey));
            callback(null, +deletions);
          })
          .catch(function (error) {
            callback(error);
          });
      }
    });
  }

  return del;
})();
