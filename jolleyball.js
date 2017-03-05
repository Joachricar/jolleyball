var canvas;
var game;
var keyMgr;

// TODO 
// - graphics scaling
// - keep key state instead of setting velocity
// - handle ball physics in its own class(to support server-side handling later).

var gameConfig = {
	gravity: 980,
	playerSpeed: 300,
	jumpSpeed: 500,
	playerRadius: 50,
	fps: 60,
	ballAirResistance: 30,
	ballCollisionPercentage: 0.1
};
function init() {
	canvas = document.getElementById("canvas");
	
	game = new Game(canvas.getBoundingClientRect(), new CanvasRenderer(canvas));
	keyMgr = new KeyboardInputManager();
	keyMgr.init();
	
	canvas.addEventListener("mouseover", function(e) {
		console.dir(e);
	});
	
	// Add two players
	addPlayer("red");
	addPlayer("blue");
	
	var prevTime = new Date().getTime();
	
	// Game loop
	setInterval(function() {
		var currentTime = new Date().getTime();
		var delta = (currentTime - prevTime) / 1000.0;
		game.update(delta);
		game.render();
		prevTime = currentTime;
	}, 1000/gameConfig.fps);
}

function Game(boardSize, renderer) {
	var self = this;
	
	self.renderer = renderer;
	self.boardSize = boardSize;
	self.players = [];
	self.entities = [];
	
	self.gameState = 0;
	
	self.ball = new Entity("green");
	self.ball.radius = 20;
	self.ball.position.x = 20;
	
	/*
	* Adds player info
	* returns controller item
	*/
	self.addPlayer = function(playerData) {
		self.players.push(playerData);
		var entity = new Entity(playerData.color);
		self.entities.push(entity);
		
		var controller = new Controller(entity);
		
		return controller;
	};
	
	self.update = function(delta) {
		for(var entity of self.entities) {
			entity.update(delta);
			
			if (entity.position.y <= 0) {
				entity.velocity.y = 0;
				entity.position.y = 0;
			}
		}
		
		self.ball.update(delta);
		
		// Ball bouncing stuffs
		var didCollide = false;
		if (self.ball.position.y <= 0 + self.ball.radius ) {
			self.ball.position.y = 0 + self.ball.radius;
			self.ball.velocity.y = -self.ball.velocity.y;
			didCollide = true;
		}
		else if (self.ball.position.y >= self.boardSize.height - self.ball.radius){
			self.ball.velocity.y = -self.ball.velocity.y;
			self.ball.position.y = self.boardSize.height - self.ball.radius;
			didCollide = true
		}
		
		if (self.ball.position.x <= 0 + self.ball.radius) {
			self.ball.position.x = 0 + self.ball.radius;
			self.ball.velocity.x = -self.ball.velocity.x;
			didCollide = true;
		}
		else if (self.ball.position.x >= self.boardSize.width - self.ball.radius) {
			self.ball.position.x = self.boardSize.width - self.ball.radius;
			self.ball.velocity.x = -self.ball.velocity.x;
			didCollide = true;
		}
		
		if (self.ball.velocity.x > 0) {
			self.ball.velocity.x -= gameConfig.ballAirResistance * delta
		}
		else if(self.ball.velocity.x < 0) {
			self.ball.velocity.x += gameConfig.ballAirResistance * delta
		}
		
		if(didCollide) {
			self.ball.velocity.x *= 1-gameConfig.ballCollisionPercentage;
			self.ball.velocity.y *= 1-gameConfig.ballCollisionPercentage;
		}
		
		// Collision ball and player
		for(var entity of self.entities) {
			// distanceVector
			
			var dv = {};
			dv.x = entity.position.x - self.ball.position.x;
			dv.y = entity.position.y - self.ball.position.y;
			
			var distance = Math.sqrt((dv.x * dv.x) + (dv.y * dv.y));
			var minDist = entity.radius + self.ball.radius;
			
			if(distance <= minDist) {
				// First test if ball is under entity.
				if (entity.position.y > self.ball.position.y && self.ball.position.y + self.ball.radius < entity.position.y) {
					continue;
				}

				// Length of total force of ball and entity.
				var v = {};
				v.x = Math.abs(self.ball.velocity.x + entity.velocity.x);
				v.y = Math.abs(self.ball.velocity.y + entity.velocity.y);
				
				v.length = Math.sqrt((v.x * v.x) + (v.y * v.y));
				
				// Calculate new angle and get force ratio
				var max = Math.abs(dv.x) + Math.abs(dv.y);
				dv.x = dv.x / max;
				dv.y = dv.y / max;
				dv.x *= -1;
				dv.y *= -1;
				
				// Apply new force ration.
				self.ball.velocity.x = dv.x * v.length;
				self.ball.velocity.y = dv.y * v.length;
			}
		}
	};
	
	self.render = function() {
		self.renderer.clear();
		
		for(var entity of self.entities) {
			self.renderer.renderPlayer(entity);
		}
		self.renderer.renderBall(self.ball);
	};
	
	self.canStart = function () {
		return self.players.length > 1;
	};
};

function Entity(color) {
	var self = this;
	self.color = color;
	self.position = {x: 200, y: 200};
	self.radius = gameConfig.playerRadius;
	self.velocity = {x: 0, y: 0};
	
	self.update = function(delta) {
		if (self.position.y > 0) {
			self.velocity.y -= gameConfig.gravity * delta; // TODO such gravity
		}
		
		self.position.x += self.velocity.x * delta;
		self.position.y += self.velocity.y * delta;
	};
}

function CanvasRenderer(canvas) {
	var self = this;
	self.canvas = canvas;
	self.boardSize = canvas.getBoundingClientRect();

	self.ctx = canvas.getContext("2d");
	
	self.renderPlayer = function(entity) {
		self.ctx.beginPath();
		self.ctx.arc(entity.position.x, self.boardSize.height - entity.position.y, entity.radius, Math.PI, 0);
		self.ctx.fillStyle = entity.color;
		self.ctx.fill();
		self.ctx.closePath();
	};
	
	self.renderBall = function(entity) {
		self.ctx.beginPath();
		self.ctx.arc(entity.position.x, self.boardSize.height - entity.position.y, entity.radius, 0, Math.PI*2);
		self.ctx.fillStyle = entity.color;
		self.ctx.fill();
		self.ctx.closePath();
	};
	
	self.clear = function() {
		self.ctx.clearRect(0, 0, canvas.width, canvas.height);
	};
}

function addPlayer(color) {
	var playerData = {
		name: "Player" + game.players.length,
		color: color
	};
	
	var newController = game.addPlayer(playerData);
	keyMgr.getFreeConfiguration(newController);
}

function KeyboardInputManager() {
	var self = this;
	
	self.freeConfigurations = [
		{
			left: "ArrowLeft",
			right: "ArrowRight",
			down: "ArrowDown",
			jump: "ArrowUp"
		},
		{
			left: "a",
			right: "d",
			down: "s",
			jump: "w"
		},
		{
			left: "j",
			right: "l",
			down: "k",
			jump: "i"
		}
	];
	
	self.usedConfigurations = [];
	
	self.hasFreeConfigurations = function() {
		return self.freeConfigurations.length > 0;
	};
	
	self.getFreeConfiguration = function(controller) {
		var config = self.freeConfigurations.shift();
		config.controller = controller;
		self.usedConfigurations.push(config);
		return config;
	};
	
	self.init = function() {
		window.addEventListener("keydown", function(event) {
			for(var config of self.usedConfigurations) {
				for(var action in config) {
					if (config[action] === event.key) {
						config.controller[action](true);
						return;
					}
				}
			}
		}, true);

		window.addEventListener("keyup", function(event) {
			for(var config of self.usedConfigurations) {
				for(var action in config) {
					if (config[action] === event.key) {
						config.controller[action](false);
						return;
					}
				}
			}
		}, true);
	};
};

function Controller(entity) {
	var self = this;
	self.entity = entity;
	
	/* state bool, true = pressed, false = released */
	self.left = function(state) {
		if(state) {
			self.entity.velocity.x = -gameConfig.playerSpeed;
		}
		else {
			self.entity.velocity.x = 0;
		}
	};
	
	self.right = function(state) {
		if(state) {
			self.entity.velocity.x = gameConfig.playerSpeed;
		}
		else {
			self.entity.velocity.x = 0;
		}
	};
	
	self.jump = function(state) {
		if(state) {
			self.entity.velocity.y = gameConfig.jumpSpeed;
		}
	};
	
	self.down = function (state) {
		
	};
};