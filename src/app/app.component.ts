import { Component, ViewChild, ElementRef, ComponentRef } from '@angular/core';
import { Dragon } from './factory/dragon';
import { Position, Food } from './factory/food';
import { Joystick } from './factory/joystick';
import { JoystickComponent } from './joystick/joystick.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  @ViewChild('canvas') groud: ElementRef;
  @ViewChild('container') container: ElementRef;
  @ViewChild('joystick') joystick: JoystickComponent;

  ctx: any;
  gridSize: number = 20;
  gridColor: string = '#f6f6f6';
  height: number = 800;
  width: number = 800;
  dragon: Dragon;
  bot: Array<Dragon> = [];
  botTimer;
  lastDate: number;
  screenCenter = {
    x: 0,
    y: 0
  };
  start = false;

  menuVisibility = true;
  
  // foods
  foods: Array<Food> = [];
  constructor (){}

  initGame() {
    this.joystick.joystick.init();
    this.dragon = new Dragon(
      'test',
      {x: 150, y: 150},
      0,
      200,
      [{x: 150, y: 151}, {x: 150, y: 152}, {x: 150, y: 153}, {x: 149, y: 153}, {x: 148, y: 153}, {x: 147, y: 152}, {x: 147, y: 151},
        {x: 147, y: 152},{x: 147, y: 153},{x: 147, y: 154},{x: 147, y: 155},{x: 147, y: 156},{x: 147, y: 157},{x: 147, y: 158},{x: 147, y: 159},{x: 147, y: 160},
        {x: 147, y: 161},{x: 147, y: 162},{x: 147, y: 163},{x: 147, y: 164},{x: 147, y: 165},{x: 147, y: 166}],
      0,
      '#FF4040'
    );
    this.bot = [];
    this.foods = [];
    this.lastDate = null;

    for(let i = 0; i < 10; i++) {
      this.generatorBot();
    }

    for(let i = 0; i < 10; i++) {
      this.generatorFood();
    }

    clearInterval(this.botTimer);
    this.botTimer = setInterval(() => {
      for(let i = 0; i < 15; i++) {
        this.generatorFood();
        this.generatorBot();
      }
    }, 5000);

    this.render();
  }

  ngOnInit() {
    this.ctx = this.groud.nativeElement.getContext('2d');

    if (window.devicePixelRatio) {
      this.groud.nativeElement.style.width = this.width + "px";
      this.groud.nativeElement.style.height = this.height + "px";
      this.groud.nativeElement.height = this.height * window.devicePixelRatio;
      this.groud.nativeElement.width = this.width * window.devicePixelRatio;
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    this.screenCenter = {
      x: this.container.nativeElement.offsetWidth / 2,
      y: this.container.nativeElement.offsetHeight / 2
    }
  }

  clearCtx(ctx) {
    ctx.clearRect(0, 0, this.width, this.height);
  }

  renderGroud(ctx) {
    this.groud.nativeElement.style.transform = 'translate(' + (this.screenCenter.x - this.dragon.header.x) + 'px,' + (this.screenCenter.y - this.dragon.header.y) + 'px)';
    ctx.lineWidth = 1;
    for(let x = 0; x < this.height / this.gridSize; x++) {
      ctx.beginPath();
      ctx.lineTo(0, x * this.gridSize);
      ctx.lineTo(this.height, x * this.gridSize);
      ctx.strokeStyle = this.gridColor;
      ctx.stroke();
    }
    for(let x = 0; x < this.width / this.gridSize; x++) {
      ctx.beginPath();
      ctx.lineTo(x * this.gridSize, 0);
      ctx.lineTo(x * this.gridSize, this.width);
      ctx.strokeStyle = this.gridColor;
      ctx.stroke();
    }
  }

  render() {
    this.clearCtx(this.ctx);

    const now = Date.now();
    if(!this.lastDate) {
      this.lastDate = now;
    }
    this.update(now - this.lastDate);

    this.renderGroud(this.ctx);
    this.dragon.render(this.ctx);
    for(let i in this.bot) {
      this.bot[i].render(this.ctx);
    }

    this.foods.forEach((food)=>{
      food.render(this.ctx);
    })

    if(this.collisionDetection()) {
      this.gameOver();
    }
    
    this.lastDate = now;

    if (this.start) {
      requestAnimationFrame(this.render.bind(this));
    }
  }

  update(space) {
    this.dragon.move(this.joystick.joystick.angle, space);
    for (let i in this.bot) {
      this.bot[i].move(this.randomDirection(this.bot[i]), space);
    }
  }

  /**
   * bot 随机方向
   * @param d 
   */
  randomDirection(d: Dragon) {
    const estimates = 70;
    const now = Date.now();

    if(now - d.lastRandomDirc <= 200) return d.direction;

    if (Math.abs((d.header.x - this.width / 2)) + estimates >= this.width / 2 - d.radius) {
      let t = Math.random() > 0.5? d.direction + 150 : d.direction - 150;

      t = t > 0 ? t % 360 : 360 + t;
      d.lastRandomDirc = now;
      return t;
    }

    if(Math.abs((d.header.y - this.height / 2)) + estimates >= this.height / 2 - d.radius) {
      let t = Math.random() > 0.5? d.direction + 150 : d.direction - 150;
      t = t > 0 ? t % 360 : 360 + t;

      d.lastRandomDirc = now;
      return t;
    }

    if (Math.random() >= 0.99) {

      d.lastRandomDirc = now;
      return Math.random() * 360;
    }

    return d.direction;
  }


  /**
   * @desc 碰撞检测
   */
  collisionDetection() {
    // 人撞墙
    if (this.wallCollisionJudge(this.dragon)) {
      this.dragonDie(this.dragon);
      return true;
    }

    // 人吃食物
    for (let i = 0; i < this.foods.length; i++) {
      if (this.eatJudge(this.dragon, this.foods[i])) {
        this.eat(this.dragon, i);
        i--;
      }
    }
    for (let i = 0; i < this.bot.length; i++) {
      // 机器人 eat food
      for (let j = 0; j < this.foods.length; j++) {
        if (this.eatJudge(this.bot[i], this.foods[j])) {
          this.eat(this.bot[i], j);
          j--;
        }
      }
      // 机器人撞墙
      if (this.wallCollisionJudge(this.bot[i])) {
        this.dragonDie(this.bot[i]);
        this.bot.splice(i, 1);
        i--;
        break;
      }

      // 机器人撞人
      if (this.dragonCollisionJudge(this.bot[i], this.dragon)) {
        this.dragonDie(this.bot[i]);
        this.bot.splice(i, 1);
        i--;
        break;
      }

      // 人撞机器人
      if (this.dragonCollisionJudge(this.dragon, this.bot[i])) {
        return true;
      }

      // 机器人撞机器人
      for (let j = 0; j< this.bot.length; j++) {
        if (i !== j && this.dragonCollisionJudge(this.bot[i], this.bot[j])) {
          this.dragonDie(this.bot[i]);
          this.bot.splice(i, 1);
          i--;
          break;
        }
      }
    }
    
    return false;
  }

  /**
   * @desc 撞墙检测
   * @param dragon: Dragon
   */
  wallCollisionJudge(dragon: Dragon) {
    if (Math.abs((dragon.header.x - this.width / 2)) >= this.width / 2 - dragon.radius) {
      return true;
    }

    if(Math.abs((dragon.header.y - this.height / 2)) >= this.height / 2 - dragon.radius) {
      return true;
    }

    return false;
  }

  /**
   * @desc 龙龙碰撞检测
   * @param s: Dragon
   * @param t: Dragon
   */
  dragonCollisionJudge(s: Dragon, t: Dragon) {
    const minD = s.radius + t.radius;

    for(let i = 0; i < t.body.length; i++) {
      const dx = t.body[i].x - s.header.x;
      const dy = t.body[i].y - s.header.y;
      const d = Math.sqrt(dx * dx + dy * dy);

      if (d <= minD) {
        return true;
      }

    }

    return false;
  }

  gameStart() {
    this.start = true;
    this.menuVisibility = false;
    this.initGame();
  }

  gameOver() {
    this.start = false;
    this.menuVisibility = true;
  }

  generatorBot() {
    const header = {
      x: Math.floor(Math.random() * (this.width - 50)) + 70,
      y: Math.floor(Math.random() * (this.height - 50)) + 50,
    }
    const body = [];

    for(let i = 1; i < 20; i++) {
      body.push({
        x: header.x - i,
        y: header.y
      })
    }

    this.bot.push(new Dragon(
      'bot',
      header,
      Math.floor(Math.random() * 360),
      150,
      body,
      0,
      '#' + Math.floor(Math.random() * 0xffffff).toString(16)
    ));
  }

  generatorFood(p?: Position, energy?: number) {
    if (!p){
      p = {
        x: Math.floor(Math.random() * this.width),
        y: Math.floor(Math.random() * this.height)
      }
    }

    if (!energy) {
      energy = Math.ceil(Math.random() * 5);
    }

    this.foods.push(new Food(p, energy));
  }

  addFoods(f: Array<Food>) {
    f.forEach((fd)=>{
      this.foods.push(fd);
    });
  }

  

  eatJudge(dragon: Dragon, food: Food) {
    const dx = dragon.header.x - food.position.x;
    const dy = dragon.header.y - food.position.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if(d < dragon.radius + food.radius) {
      return true;
    }

    return false;
  }

  eat(dragon: Dragon, foodIndex: number) {
    const energy = this.foods[foodIndex].energy;
    this.foods.splice(foodIndex, 1);
    dragon.grow(dragon.body[dragon.body.length - 1], energy);
  }

  dragonDie(dragon: Dragon) {
    let positons = dragon.die();
    
    const energy = Math.ceil(positons.length / 25);

    positons = positons.filter((v, i) => {
      return i % (energy * 5) === 0;
    })
    positons.forEach((p) => {
       this.generatorFood(p, energy);
    })
  }
}
