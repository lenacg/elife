
var plan = ["############################",
            "#      #    #      o      ##",
            "#                          #",
            "#          #####           #",
            "##         #   #    ##     #",
            "###           ##     #     #",
            "#           ###      #     #",
            "#   ####                   #",
            "#   ##       o             #",
            "# o  #         o       ### #",
            "#    #                     #",
            "############################"];

class Vector{
    constructor(x,y){
        this.x=x;
        this.y=y;
    }
    plus(other){
        return new Vector(this.x + other.x, this.y + other.y);
    }
};

class Grid{
  constructor(width,height){
    this.space = new Array(width * height);
    this.width = width;
    this.height = height;
  }
  isInside(vector){
    return vector.x >= 0 && vector.x < this.width &&
         vector.y >= 0 && vector.y < this.height;
  }
  get(vector){
    return this.space[vector.x + this.width * vector.y];
  }
  set(vector,value){
    this.space[vector.x + this.width * vector.y] = value;
  }
  forEach(f,context){
    for (var y = 0; y < this.height; y++) {
      for (var x = 0; x < this.width; x++) {
        var value = this.space[x + y * this.width];
        if (value != null)
          f.call(context, value, new Vector(x, y));
      }
    }
  }
};

var directions = {
  "n":  new Vector( 0, -1),
  "ne": new Vector( 1, -1),
  "e":  new Vector( 1,  0),
  "se": new Vector( 1,  1),
  "s":  new Vector( 0,  1),
  "sw": new Vector(-1,  1),
  "w":  new Vector(-1,  0),
  "nw": new Vector(-1, -1)
};

function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

var directionNames = "n ne e se s sw w nw".split(" ");

class BouncingCritter{
  constructor(){
    this.direction = randomElement(directionNames);
  }
  act(view){
    if (view.look(this.direction) != " ")
    this.direction = view.find(" ") || "s";
    return {type: "move", direction: this.direction};
  }
};

function elementFromChar(legend, ch) {
  if (ch == " ")
    return null;
  var element = new legend[ch]();
  element.originChar = ch;
  return element;
}

class World{
  constructor(map,legend){
    var grid = new Grid(map[0].length, map.length);
    this.grid = grid;
    this.legend = legend;

    map.forEach(function(line, y) {
      for (var x = 0; x < line.length; x++)
        grid.set(new Vector(x, y),
                elementFromChar(legend, line[x]));
    });
  }
  toString(){
    var output = "";
    for (var y = 0; y < this.grid.height; y++) {
      for (var x = 0; x < this.grid.width; x++) {
        var element = this.grid.get(new Vector(x, y));
        output += charFromElement(element);
      }
      output += "\n";
    }
    return output;
  }
  turn(){
    var acted = [];
    this.grid.forEach(function(critter, vector) {
      if (critter.act && acted.indexOf(critter) == -1) {
        acted.push(critter);
        this.letAct(critter, vector);
      }
    }, this);
  }
  letAct(critter, vector){
    var action = critter.act(new View(this, vector));
    if (action && action.type == "move") {
      var dest = this.checkDestination(action, vector);
      if (dest && this.grid.get(dest) == null) {
        this.grid.set(vector, null);
        this.grid.set(dest, critter);
      }
    }
  }
  checkDestination(action,vector){
    if (directions.hasOwnProperty(action.direction)) {
      var dest = vector.plus(directions[action.direction]);
      if (this.grid.isInside(dest))
        return dest;
    }
  }
};

function charFromElement(element) {
  if (element == null)
    return " ";
  else
    return element.originChar;
}

class Wall{
  constructor(){}
}
// function Wall() {}

var world = new World(plan, {"#": Wall,
                             "o": BouncingCritter});
//   #      #    #      o      ##
//   #                          #
//   #          #####           #
//   ##         #   #    ##     #
//   ###           ##     #     #
//   #           ###      #     #
//   #   ####                   #
//   #   ##       o             #
//   # o  #         o       ### #
//   #    #                     #
//   ############################

class View{
  constructor(world,vector){
    this.world = world;
    this.vector = vector;
  }
  look(dir){
    var target = this.vector.plus(directions[dir]);
    if (this.world.grid.isInside(target))
      return charFromElement(this.world.grid.get(target));
    else
      return "#";
  }
  findAll(ch){
    var found = [];
    for (var dir in directions)
      if (this.look(dir) == ch)
        found.push(dir);
    return found;
  }
  find(ch){
    var found = this.findAll(ch);
    if (found.length == 0) return null;
    return randomElement(found);
  }
};

function dirPlus(dir, n) {
  var index = directionNames.indexOf(dir);
  return directionNames[(index + n + 8) % 8];
}

class WallFollower{
  constructor(){
    this.dir = "s";
  }
  act(view){
    var start = this.dir;
    if (view.look(dirPlus(this.dir, -3)) != " ")
      start = this.dir = dirPlus(this.dir, -2);
    while (view.look(this.dir) != " ") {
      this.dir = dirPlus(this.dir, 1);
      if (this.dir == start) break;
    }
    return {type: "move", direction: this.dir};
  }
}
// function WallFollower() {
//   this.dir = "s";
// }

// WallFollower.prototype.act = function(view) {
//   var start = this.dir;
//   if (view.look(dirPlus(this.dir, -3)) != " ")
//     start = this.dir = dirPlus(this.dir, -2);
//   while (view.look(this.dir) != " ") {
//     this.dir = dirPlus(this.dir, 1);
//     if (this.dir == start) break;
//   }
//   return {type: "move", direction: this.dir};
// };

class LifelikeWorld extends World{
  constructor(map,legend){
    super(map,legend);
  }
  letAct(critter,vector){
    var action = critter.act(new View(this, vector));
    var handled = action &&
      action.type in actionTypes &&
      actionTypes[action.type].call(this, critter,
                                    vector, action);
    if (!handled) {
      critter.energy -= 0.2;
      if (critter.energy <= 0)
        this.grid.set(vector, null);
    }
  }
}

var actionTypes = Object.create(null);

actionTypes.grow = function(critter) {
  critter.energy += 0.5;
  return true;
};

actionTypes.move = function(critter, vector, action) {
  var dest = this.checkDestination(action, vector);
  if (dest == null ||
      critter.energy <= 1 ||
      this.grid.get(dest) != null)
    return false;
  critter.energy -= 1;
  this.grid.set(vector, null);
  this.grid.set(dest, critter);
  return true;
};

actionTypes.eat = function(critter, vector, action) {
  var dest = this.checkDestination(action, vector);
  var atDest = dest != null && this.grid.get(dest);
  if (!atDest || atDest.energy == null)
    return false;
  critter.energy += atDest.energy;
  this.grid.set(dest, null);
  return true;
};

actionTypes.reproduce = function(critter, vector, action) {
  var baby = elementFromChar(this.legend,
                             critter.originChar);
  var dest = this.checkDestination(action, vector);
  if (dest == null ||
      critter.energy <= 2 * baby.energy ||
      this.grid.get(dest) != null)
    return false;
  critter.energy -= 2 * baby.energy;
  this.grid.set(dest, baby);
  return true;
};

class Plant{
  constructor(){
    this.energy = 3 + Math.random() * 4;
  }
  act(view){
    if (this.energy > 15) {
      var space = view.find(" ");
      if (space)
        return {type: "reproduce", direction: space};
    }
    if (this.energy < 20)
      return {type: "grow"};
  }
}

class PlantEater{
  constructor(){
    this.energy = 20;
  }
  act(view){
    var space = view.find(" ");
    if (this.energy > 60 && space)
      return {type: "reproduce", direction: space};
    var plant = view.find("*");
    if (plant)
      return {type: "eat", direction: plant};
    if (space)
      return {type: "move", direction: space};
  }
}

var valley = new LifelikeWorld(
  ["############################",
   "#####                 ######",
   "##   ***                **##",
   "#   *##**         **  O  *##",
   "#    ***     O    ##**    *#",
   "#       O         ##***    #",
   "#                 ##**     #",
   "#   O       #*             #",
   "#*          #**       O    #",
   "#***        ##**    O    **#",
   "##****     ###***       *###",
   "############################"],
  {"#": Wall,
   "O": PlantEater,
   "*": Plant}
);

class SmartPlantEater{
  constructor(){
    this.energy = 20;
    this.direction=randomElement(directionNames);
  }
  act(view){
    var space = view.find(" ");
    if (this.energy > 80 && space)
      return {type: "reproduce", direction: space};
    var plants = view.findAll("*");
    if (plants.length > 1)
      return {type: "eat", direction: randomElement(plants)};
    if (view.look(this.direction) != " " && space)
      this.direction = space;
    return {type: "move", direction: this.direction};
  }
}

class Tiger{
  constructor(){
    this.energy = 50;
   this.direction=randomElement(directionNames);
  }
  act(view){
    var space = view.find(" ");
    if (this.energy > 190 && space)
      return {type: "reproduce", direction: space};
    var animals = view.findAll("O");
    if (animals.length)
      return {type: "eat", direction: randomElement(animals)};
    if (view.look(this.direction) != " " && space)
      this.direction = space;
    return {type: "move", direction: this.direction};
  }
}

var myWorld = new LifelikeWorld(
  ["################################",
   "#####         ####        ######",
   "##   ***  O      O          **##",
   "#   *##**      $      **  O  *##",
   "#    ***     O    ##**      * *#",
   "#       O      O  *   ##***    #",
   "#         **          ##**     #",
   "#   O       #*                 #",
   "#*          #**   ##      O    #",
   "#***     O  *  O##**    O    **#",
   "#   **         *    *       * ##",
   "#*   *      ##**    *    O  *###",
   "#   **  $  ###**  ****      *###",
   "##****     ## *     ***     *###",
   "################################"],
  {"#": Wall,
   "O": SmartPlantEater,
   "*": Plant,
   "$": Tiger}
);