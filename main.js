var game;
var timecard = [];

window.onload = function() {
  game = new function() {
    this.looper;
    this.frame = -1;
    this.isPlaying = false;
    this.isPaused = false;
    this.levelUpFrame = null;
    this.failureFrame = null;
    this.dividends = [];
    this.divisors = [];
    this.lives = 3;
    this.level;
    this.initialLevel = 0;
    this.score = 0;
    this.combo = 0;
    this.direction = null;
    this.latestDirection = null;
    this.reservedDirection = null;

    this.showTitle = function() {
      this.canvas.clear();
      this.canvas.ctx.drawImage(game.util.titleImage, 0, 0);
      this.util.doms.canvas.addEventListener('click', starter);
    }

    this.changeInitialLevel = function(mode) {
      if (this.initialLevel === 0) {
        this.initialLevel = 1;
      } else if (!(this.initialLevel === 1 && !mode) && !(this.initialLevel === 10 && mode) && !(this.initialLevel === this.util.cookie['bestLevel'] && mode)) {
        this.initialLevel += (mode ? 1 : -1);
      }
      this.util.log('start with level ' + this.initialLevel);
    }

    this.start = function() {
      this.util.doms.canvas.removeEventListener('click', starter);
      //this.canvas.ctx.setTransform(1, 0.2, 0.3, 1, 0, 0);
      this.frame = -1;
      this.isPaused = false;
      this.dividends = [];
      this.divisors = [];
      this.latestDirection = null;
      this.lives = 3;
      this.score = 0;
      this.combo = 0;

      this.level = (this.initialLevel === 0 ? 1 : this.initialLevel);
      this.config.speed = this.util.speedList[this.level];
      this.config.freq = this.util.freqList[this.level];
      this.config.meter = 4;
      this.config.beatFreq = this.config.freq / this.config.meter;
      this.util.calculateReqFrame();
      this.initDividends();
      if (this.looper) {
        clearInterval(this.looper);
      }
      this.startLoop();
      this.isPlaying = true;
    };

    this.finish = function() {
      this.isPlaying = false;
      clearInterval(this.looper);
      if (this.score > this.util.cookie['bestScore']) {
        this.util.saveCookie('bestScore', this.score);
      }
    }

    this.gameover = function() {
      this.finish();
      this.showTitle();
    }

    this.startLoop = function() {
      this.looper = setInterval(function() {
        game.process();
      }, 10);
    }

    this.process = function() {
      var dividend, divisor, len, trash = [];

      this.frame++;
      this.direction = this.reservedDirection;

      if (this.levelUpFrame !== null) {
        this.canvas.drawLevelUp(++this.levelUpFrame);
        if (this.levelUpFrame === 150) {
          this.dividends = [];
          this.initDividends();
          this.divisors = [];
          this.latestDirection = null;
          this.config.speed = this.util.speedList[this.level];
          this.config.freq = this.util.freqList[this.level];
          this.config.meter = 4;
          this.config.beatFreq = this.config.freq / this.config.meter;
          this.util.calculateReqFrame();
          this.levelUpFrame = null;
        }
      } else if (this.failureFrame !== null) {
        if (this.failureFrame === 0) {
          this.canvas.ctx.beginPath();
          this.canvas.ctx.fillStyle = 'rgba(255, 128, 128, 0.4)';
          this.canvas.ctx.fillRect(0, 0, 600, 600);
        }
        this.failureFrame++;
        if (this.failureFrame === 200) {
          this.failureFrame = null;
          if (this.lives === 0) {
            this.gameover();
          } else {
            this.dividends = [];
            this.divisors = [];
            this.latestDirection = null;
            this.initDividends();
          }
        }
      } else {
      if (this.frame % game.config.freq === 0) {
        this.generateDivisor();
      }

      for (var key in this.divisors) {
        divisor = this.divisors[key];
        if (this.frame - this.divisors[key].frame === this.util.reqFrame.judgement) {
          if ((divisor.direction === this.direction) || this.direction === null) {
            divisor.newDirection = (divisor.direction + 2) % 4;
          } else {
            divisor.newDirection = this.direction;
          }

          dividend = this.dividends[this.divisors[key].newDirection];
          if (dividend.divideBy(divisor.number)) {
            divisor.isAssigned = true;
            this.combo++;
            game.util.log(this.combo + ' combo');
            if (dividend.number === 1) {
              this.addScore(dividend.originalNumber);
              this.generateDividend(divisor.newDirection);
            } else {
              this.addScore(divisor.number);
            }
            if (this.score >= this.util.reqScoreList[this.level]) {
              this.levelUp();
              return;
            }
          } else{
            this.failure();
          }
        } else if (this.frame - divisor.frame === this.util.reqFrame.judgement + 1000) {
          trash.push(key);
        }
      }
      len = trash.length;
      for (var i = 0; i < len; i++) {
        this.divisors.splice(trash[i], 1);
      }
      for (var key in this.divisors) {
        if (!this.divisors[key].isAssigned) {
          this.latestDirection = this.divisors[key].direction;
          break;
        }
      }
      this.draw();
      this.util.doms.score.textContent = this.score;
      this.util.doms.lives.textContent = this.lives;
      }
    };

    this.draw = function() {
      this.canvas.clear();
      this.canvas.drawIndicator();
      this.canvas.drawDivisors();
      this.canvas.drawDividends();
    };

    this.generateDividend = function(direction) {
      var num = this.util.dividendsList[this.level][this.util.random(this.util.dividendsList[this.level].length)];
      this.dividends[direction] = new Dividend(num);
    };

    this.initDividends = function() {
      for (var i = 0; i < 4; i++) {
        this.generateDividend(i);
      }
      this.frame = -1;
    }

    this.generateDivisor = function() {
      var pIndices = this.util.pIndexList[this.level];
      var availablePIndices = [];
      var direction = game.util.random(4);
      var times;
      var myCap = 0, othersCap = 0;
      var prime;
      var othersProduct = this.dividends[0].number * this.dividends[1].number * this.dividends[2].number * this.dividends[3].number / this.dividends[direction].number;
      var dList = [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]];

      for (var dKey in this.divisors) {
        if (!this.divisors[dKey].isAssigned) {
          dList[this.divisors[dKey].direction][this.divisors[dKey].pIndex]++;
        }
      }

      for (var key in pIndices) {
        prime = this.util.primes[pIndices[key]];
        myCap = 0;
        othersCap = 0;

        quot = this.dividends[direction].number;
        while (quot % prime === 0) {
          quot /= prime;
          myCap++;
        }
        quot = othersProduct;
        while (quot % prime === 0) {
          quot /= prime;
          othersCap++;
        }

        if (myCap < dList[0][pIndices[key]] + dList[1][pIndices[key]] + dList[2][pIndices[key]] + dList[3][pIndices[key]] - dList[direction][pIndices[key]]) {
          othersCap -= myCap;
        }

        othersCap -= dList[0][pIndices[key]] + dList[1][pIndices[key]] + dList[2][pIndices[key]] + dList[3][pIndices[key]];
        if (othersCap > 0) {
          availablePIndices.push(pIndices[key]);
        }
        if (othersCap === NaN) {
          game.util.log(dList[direction][pIndices[key]]);
        }
      }

      if (availablePIndices === []) {
        game.util.log('undefined appeared!');
      }
      var pIndex = availablePIndices[this.util.random(availablePIndices.length)];
      var number = game.util.primes[pIndex];
      this.divisors.push(new Divisor(pIndex, number, direction, this.frame));
    };

    this.addScore = function(score) {
      if (this.combo >= 100) {
        this.score += Math.floor(score * 1.3);
      } else if (this.combo >= 50) {
        this.score += Math.floor(score * 1.2);
      } else if (this.combo >= 20) {
        this.score += Math.round(score * 1.1);
      } else {
        this.score += score;
      }
    }

    this.levelUp = function() {
      this.level++;
      this.levelUpFrame = 0;
      if (this.util.cookie.bestLevel < this.level) {
        this.util.saveCookie('bestLevel', this.level);
      }

      document.getElementById('timecard').appendChild(document.createTextNode((this.level - 1) + ' : ' + this.frame + ' / '));
    }

    this.failure = function() {
      this.lives--;
      this.combo = 0;
      this.failureFrame = 0;
    }

    this.canvas = new function() {
      this.domElement = document.getElementById('canvas');
      this.ctx = this.domElement.getContext('2d');
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      this.clear = function() {
        this.ctx.clearRect(0, 0, this.domElement.width, this.domElement.height);
      }

      this.drawDivisor = function(pIndex, number, frame, direction, isAssigned, newDirection, isWithCursor) {
        var color, originX, originY, originX_, originY_, expand;
        var cx1, cx2, cx3, cy1, cy2, cy3, cx1_, cx2_, cx3_, cy1_, cy2_, cy3_;
        var newDirection;
        var lu = game.levelUpFrame > 20 ? 20 : game.levelUpFrame;
        if (!isAssigned) {
          color = game.util.colors[pIndex];
          switch (direction) {
          case 0:
            originX = -game.config.speed * frame + 600;
            originY = 317;
            break;
          case 1:
            originX = 317;
            originY = game.config.speed * frame - 40;
            break;
          case 2:
            originX = game.config.speed * frame - 40;
            originY = 243;
            break;
          case 3:
            originX = 243;
            originY = -game.config.speed * frame + 600;
            break;
          }
          if (isWithCursor) {
            if ((direction === game.direction) || game.direction === null) {
              newDirection = (direction + 2) % 4;
            } else {
              newDirection = game.direction;
            }
            switch ((newDirection - direction + 4) % 4) {
              case 1: // turning right
                cx1 = originX - 14;
                cx2 = originX - 14 + 14 * game.util.sin15;
                cx3 = originX - 14 + 14 * game.util.cos15;
                cy1 = originY - 14;
                cy2 = originY - 14 + 14 * game.util.cos15;
                cy3 = originY - 14 + 14 * game.util.sin15;
                break;
              case 2: // going straight
                cx1 = originX - 7;
                cy1 = originY + 13;
                cx2 = originX - 7;
                cy2 = originY + 27;
                cx3 = originX - 7 - 7 * game.util.sqrt3;
                cy3 = originY + 20;
                break;
              case 3: // turning left
                cx1 = originX - 14;
                cx2 = originX - 14 + 14 * game.util.sin15;
                cx3 = originX - 14 + 14 * game.util.cos15;
                cy1 = originY + 54;
                cy2 = originY + 54 - 14 * game.util.cos15;
                cy3 = originY + 54 - 14 * game.util.sin15;
                break;
            }
            switch (direction) {
              case 0:
                cx1_ = cx1;
                cx2_ = cx2;
                cx3_ = cx3;
                cy1_ = cy1;
                cy2_ = cy2;
                cy3_ = cy3;
                break;
              case 1:
                cx1_ = cy1 + originX - originY;
                cx2_ = cy2 + originX - originY;
                cx3_ = cy3 + originX - originY;
                cy1_ = -cx1 + originX + originY + 40;
                cy2_ = -cx2 + originX + originY + 40;
                cy3_ = -cx3 + originX + originY + 40;
                break;
              case 2:
                cx1_ = -cx1 + 2 * (originX + 20);
                cx2_ = -cx2 + 2 * (originX + 20);
                cx3_ = -cx3 + 2 * (originX + 20);
                cy1_ = -cy1 + 2 * (originY + 20);
                cy2_ = -cy2 + 2 * (originY + 20);
                cy3_ = -cy3 + 2 * (originY + 20);
                break;
              case 3:
                cx1_ = -cy1 + originX + originY + 40;
                cx2_ = -cy2 + originX + originY + 40;
                cx3_ = -cy3 + originX + originY + 40;
                cy1_ = cx1 - originX + originY;
                cy2_ = cx2 - originX + originY;
                cy3_ = cx3 - originX + originY;
                break;
            }
            this.ctx.beginPath();
            this.ctx.fillStyle = game.util.colors[pIndex];
            this.ctx.moveTo(cx1_, cy1_);
            this.ctx.lineTo(cx2_, cy2_);
            this.ctx.lineTo(cx3_, cy3_);
            this.ctx.closePath();
            this.ctx.fill();
          }
        } else {
          color = '#ccc';
          switch ((newDirection - direction + 4) % 4) {
            case 1: // turning right
              if (frame < game.util.reqFrame.straight) {
                originX = 243;
                originY = -game.config.speed * frame + 600;
              } else if (frame < game.util.reqFrame.rightCurve) {
                originX = 243 + 110 - 110 * Math.cos((frame - game.util.reqFrame.straight) / (game.util.reqFrame.rightCurve - game.util.reqFrame.straight) * Math.PI / 2);
                originY = 353 - 110 * Math.sin((frame - game.util.reqFrame.straight) / (game.util.reqFrame.rightCurve - game.util.reqFrame.straight) * Math.PI / 2);
              } else {
                originX = game.config.speed * (frame - game.util.reqFrame.rightCurve) + 353;
                originY = 243;
              }
              break;

            case 2: // going straight
              originX = game.config.speed * frame - 40;
              originY = 243;
              break;

            case 3: // turning left
              if (frame < game.util.reqFrame.straight) {
                originX = 317;
                originY = game.config.speed * frame - 40;
              } else if (frame < game.util.reqFrame.leftCurve) {
                originX = 317 + 35 - 35 * Math.cos((frame - game.util.reqFrame.straight) / (game.util.reqFrame.leftCurve - game.util.reqFrame.straight) * Math.PI / 2);
                originY = 208 + 35 * Math.sin((frame - game.util.reqFrame.straight) / (game.util.reqFrame.leftCurve - game.util.reqFrame.straight) * Math.PI / 2);
              } else {
                originX = game.config.speed * (frame - game.util.reqFrame.leftCurve) + 353;
                originY = 243;
              }
              break;
          }
          switch (newDirection) {
            case 0:
              originX_ = originX;
              originY_ = originY;
              break;
            case 1:
              originX_ = originY;
              originY_ = 560 - originX;
              break;
            case 2:
              originX_ = 560 - originX;
              originY_ = 560 - originY;
              break;
            case 3:
              originX_ = 560 - originY;
              originY_ = originX;
              break;
          }
          originX = originX_;
          originY = originY_;
        }
        if (game.frame % game.config.beatFreq === 0) {
          expand = 3;
        } else if (((game.frame + 1) % game.config.beatFreq === 0) || ((game.frame - 1) % game.config.beatFreq) === 0) {
          expand = 2;
        } else {
          expand = 0;
        }
        this.ctx.beginPath();
        this.ctx.fillStyle = color;
        this.ctx.fillRect(originX - expand + lu, originY - expand + lu, 40 + 2 * expand - 2 * lu, 40 + 2 * expand - 2 * lu);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = "28px 'Menlo'";
        this.ctx.fillText(number, originX + 20, originY + 20);
      };

      this.drawDivisors = function() {
        var newestKey;
        for (var key in game.divisors) {
          if (game.frame - game.divisors[key].frame < 1000) {
            game.canvas.drawDivisor(game.divisors[key].pIndex, game.divisors[key].number, game.frame - game.divisors[key].frame, game.divisors[key].direction, game.divisors[key].isAssigned, game.divisors[key].newDirection, (!newestKey && game.divisors[key].isAssigned === false && (newestKey = key)));
          }
        }
      }

      this.drawDividends = function(number) {
        this.ctx.fillStyle = 'rgb(244, 192, 64)';
        this.ctx.font = "40px 'Menlo'";
        if (typeof game.dividends[0] !== 'undefined') {
          this.ctx.fillText(game.dividends[0].number, 450, 263, 72);
        }
        if (typeof game.dividends[1] !== 'undefined') {
          this.ctx.fillText(game.dividends[1].number, 263, 150, 72);
        }
        if (typeof game.dividends[2] !== 'undefined') {
          this.ctx.fillText(game.dividends[2].number, 150, 337, 72);
        }
        if (typeof game.dividends[3] !== 'undefined') {
          this.ctx.fillText(game.dividends[3].number, 337, 450, 72);
        }
      }

      this.drawIndicator = function() {
        var x, y;
        if (game.latestDirection !== null) {
          if ((game.latestDirection === game.direction) || game.direction === null) {
           newDirection = (game.latestDirection + 2) % 4;
         } else {
           newDirection = game.direction;
         }

         switch(newDirection) {
         case 0:
           x = 373;
           y = 228;
           break;
         case 1:
           this.ctx.rotate(-Math.PI / 2);
           x = -227;
           y = 228;
           break;
         case 2:
           this.ctx.rotate(Math.PI);
           x = -228;
           y = -372;
           break;
         case 3:
           this.ctx.rotate(Math.PI / 2);
           x = 376;
           y = -372;
           break;
         }
         this.ctx.drawImage(game.util.arrowsImage, x, y);
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
      }

      this.drawLevelUp = function(frame) {
        this.clear();
        this.ctx.beginPath();
        this.ctx.fillStyle = '#dbb';
        if (frame < 30) {
          this.ctx.fillRect(275 - frame * 10, 299, frame * 20, 2);
        } else if (frame < 50) {
          this.ctx.fillRect(0, 300 - 1.5 * (frame - 30), 600, 3 * (frame - 30));
        } else if (frame < 140) {
          this.ctx.fillRect(0, 270, 600, 60);
          this.ctx.fillStyle = '#fff';
          this.ctx.font = "35px 'Menlo'";
          this.ctx.fillText('Level Up', 300, 300);
        } else {
          this.ctx.fillRect(0, 300 - 3 * (150 - frame), 600, 6 * (150 - frame));
        }
        this.drawDivisors();
      }

      this.drawPause = function() {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = "26px 'Menlo'";
        this.ctx.fillText('paused', 300, 300);
      }
    };

    this.config = {speed: null, freq: null, meter: null, beatFreq: null};

    this.util = new function() {
      this.primes = [2, 3, 5, 7, 11, 13, 17, 19];
      this.reqScoreList = [0, 300, 1000, 2500, 5500, 9000, 13000];

      this.dividendsList = [[],
        [8, 12, 18, 20, 27, 30, 45, 50, 75, 125],
        // level 1 : [2, 3, 5] / dist = 3
        [16, 24, 36, 40, 54, 60, 81, 90, 100, 135, 150, 225, 250, 375, 625],
        // level 2 : [2, 3, 5] / dist = 4
        [8, 12, 18, 20, 27, 28, 30, 42, 45, 50, 63, 70, 75, 98, 105, 125, 147, 175, 245, 343],
        // level 3 : [2, 3, 5, 7] / dist = 3
        [16, 24, 36, 40, 54, 56, 60, 81, 84, 90, 100, 126, 135, 140, 150, 189, 196, 210, 225, 250, 294, 315, 350, 375, 441, 490, 525, 625, 686, 735, 875, 1029, 1225, 1715, 2401],
      // level 4 : [2, 3, 5, 7] / dist = 4
        [27, 45, 63, 75, 99, 105, 125, 147, 165, 175, 231, 245, 275, 343, 363, 385, 539, 605, 847, 1331],
          // level 5 : [3, 5, 7, 11] / dist = 3
        [81, 135, 189, 225, 297, 315, 375, 441, 495, 525, 625, 693, 735, 825, 875, 1029, 1089, 1155, 1225, 1375, 1617, 1715, 1815, 1925, 2401, 2541, 2695, 3025, 3773, 3993, 4235, 5929, 6655, 9317, 14641],
          // level 6 : [3, 5, 7, 11] / dist = 4
        [32, 48, 72, 80, 108, 120, 162, 180, 200, 243, 270, 300, 405, 450, 500, 675, 750, 1125, 1250, 1875, 3125],
          // level 7 : [2, 3, 5] / dist = 5
  [8, 12, 18, 20, 27, 28, 30, 42, 45, 50, 63, 70, 75, 98, 105, 125, 147, 175, 245, 343],
          // level 8 : [2, 3, 5, 7] / dist = 3
  [8, 12, 18, 20, 27, 28, 30, 42, 44, 45, 50, 63, 66, 70, 75, 98, 99, 105, 110, 125, 147, 154, 165, 175, 231, 242, 245, 275, 343, 363, 385, 539, 605, 847, 1331],
          // level 9 : [2, 3, 5, 7, 11] / dist = 3
  [8, 12, 18, 20, 27, 28, 30, 42, 44, 45, 50, 52, 63, 66, 70, 75, 78, 98, 99, 105, 110, 117, 125, 130, 147, 154, 165, 175, 182, 195, 231, 242, 245, 273, 275, 286, 325, 338, 343, 363, 385, 429, 455, 507, 539, 605, 637, 715, 845, 847, 1001, 1183, 1331, 1573, 1859, 2197]
      ];

      this.pIndexList = [[], [0, 1, 2], [0, 1, 2], [0, 1, 2, 3], [0, 1, 2, 3], [1, 2, 3, 4], [1, 2, 3, 4], [0, 1, 2], [0, 1, 2, 3], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4, 5]];
      this.speedList = [0, 1, 1.3, 1.3, 1.5, 1.3, 1.5, 1.7, 2, 2, 2];
      this.freqList = [0, 140, 120, 130, 120, 140, 140, 80, 80, 80, 80];

      this.colors = ['#b88', '#bb8', '#b8b', '#88b', '#8b8', '#8bb'];
      this.reqFrame = {judgement: null, straight: null, leftCurve: null, rightCurve: null, vanishment: null};

      this.calculateReqFrame = function() {
        this.reqFrame.judgement = Math.floor(228 / game.util.speedList[game.level]);
        this.reqFrame.straight = Math.floor(248 / game.util.speedList[game.level]);
        this.reqFrame.leftCurve = Math.floor(this.reqFrame.straight + (17.5 * Math.PI) / game.util.speedList[game.level]);
        this.reqFrame.rightCurve = Math.floor(this.reqFrame.straight + (55 * Math.PI) / game.util.speedList[game.level]);
      }

      this.isNatural = function(number) {
        if ((number == parseInt(number)) && (number > 0)) {
          return true;
        } else {
          return false;
        }
      };

      this.cos15 = Math.cos(Math.PI / 12);
      this.sin15 = Math.sin(Math.PI / 12);
      this.sqrt3 = Math.sqrt(3);

      this.random = function(number) {
        return Math.floor(Math.random() * number);
      };

      this.doms = {canvas: document.getElementById('canvas'), score: document.getElementById('score'), lives: document.getElementById('lives'), log: document.getElementById('log')};
 
      this.arrowsImage = new Image();
      this.arrowsImage.src = 'arrows.png';

      this.titleImage = new Image();
      this.titleImage.src = 'title.png';

      this.cookie = {};

      this.saveCookie = function(key, value) {
        document.cookie = '' + encodeURIComponent(key) + '=' + encodeURIComponent(value) + ';';
        this.cookie[key] = value;
      }

      this.clearCookie = function(key) {
        this.saveCookie(key, '');
      }

      this.log = function(message) {
        this.doms.log.textContent = message;
      };
    };
  }

  var Dividend = function(number) {
    this.number = number;
    this.originalNumber = number;
  };

  Dividend.prototype.divideBy = function(devisor) {
    if (game.util.isNatural(devisor) && (this.number % devisor === 0)) {
      this.number /= devisor;
      return true;
    } else {
      return false;
    }
  };

  Dividend.prototype.add = function(num) {
    if (game.util.isNatural(num)) {
      this.number += num;
      return true;
    } else {
      return false;
    }
  };

  Divisor = function(pIndex, number, direction, frame) {
    this.pIndex = pIndex;
    this.number = number;
    this.frame = frame;
    this.direction = direction;
    this.isAssigned = false;
    this.newDirection;
  };

  document.onkeydown = function(e) {
    if (game.isPlaying) { // when the game is being played
      if (e.which === 37 || e.which === 65 || e.which == 72) {
        game.reservedDirection = 2;
      } else if (e.which === 38 || e.which === 87 || e.which === 75) {
        game.reservedDirection = 1;
      } else if (e.which === 39 || e.which === 68 || e.which === 76) {
        game.reservedDirection = 0;
      } else if (e.which === 40 || e.which === 83 || e.which === 74) {
        game.reservedDirection = 3;
      } else if (e.which === 32) {
        if (game.isPaused) {
          game.draw();
          game.startLoop();
          game.isPaused = false;
        } else {
          game.canvas.clear();
          game.canvas.drawPause();
          clearInterval(game.looper);
          game.isPaused = true;
        }
      }
    } else { // when the game is NOT being played
      if (e.which === 13 || e.which === 32) {
        game.start();
      } else if (e.which === 38 || e.which === 87 || e.which === 75) {
        game.changeInitialLevel(true);
      } else if (e.which === 40 || e.which === 83 | e.which === 74) {
        game.changeInitialLevel(false);
      }
    }
    if (e.which === 84) {
      game.finish();
      game.showTitle();
    }
  };

  document.onkeyup = function() {
    game.reservedDirection = null;
  };

  (function() {
    if (document.cookie !== '') {
      cookies = document.cookie.split(';');
      var len = cookies.length;
      for (var i = 0; i < len; i++) {
        var cookie = cookies[i].split('=');
        game.util.cookie[decodeURIComponent(cookie[0].trim())] = decodeURIComponent(cookie[1]);
      }
    }

    game.util.cookie['bestScore'] = parseInt(game.util.cookie['bestScore']) ? parseInt(game.util.cookie['bestScore']) : 0;
    game.util.cookie['bestLevel'] = parseInt(game.util.cookie['bestLevel']) ? parseInt(game.util.cookie['bestLevel']) : 0;
  })();

  game.showTitle();
}

function starter() {
  if (!game.isPlaying) {
    game.start();
  }
}

