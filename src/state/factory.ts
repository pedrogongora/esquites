import * as PIXI from 'pixi.js';
import { Entity,Component, Engine, GameEvent } from 'fosfeno';
import { CollisionComponent,HealthComponent,InputComponent,PositionComponent,SpriteComponent,DynamicsComponent,AnimationsComponent,DestroyWhenAnimationOffComponent,TextFromProperty,TypeComponent,CounterComponent,SpriteAnimation,ButtonComponent, CollisionEventComponent, FollowComponent, DestroyWhenNotOnScreenComponent, RenderDynamicsRotation } from '../components';
import { World } from './world';


const zIndex = {
    floor: 0,
    player: 100,
    tree: 200,
    bear: 150,
    snowball: 150,
    bunny: 50,
    border: 300,
    hitFlash: 500,
    ui: 1000
};


const boxes = {
    player: { x: 25-32, y: 11-32, w: 14, h: 40 },
    tree: { x: 16, y: 33, w: 31, h: 30 },
    border: { x: 10, y: 20, w: 42, h: 44 },
    touch: { x: 0, y: 0, w: 32, h: 32 },
    goalEvent: { x: 0, y: 0, w: 64*6, h: 64 },
    activateBearEvent: { x: -64*10, y: 0, w: 64*20, h: 64 },
    activateFlagEvent: { x: -64*5, y: 0, w: 64*6, h: 64 },
    bear: { x: 10-32, y: 5-32, w: 44, h: 54 },
    snowball: { x: 9-32, y: 9-32, w: 48, h: 48 }
};


const playerMaxHP = 10;


const randInt = (max: number) => { return Math.floor(Math.random() * Math.floor(max)) };
const tosscoin = () => Math.round( Math.random() );


const newSprite = function(texture: string) {
    const s = new PIXI.Sprite( PIXI.utils.TextureCache[texture] );
    switch( texture ) {
        case 'snow01.png':
            s.zIndex = zIndex.floor;
            break;
        case 'tree01.png':
        case 'tree02.png':
        case 'flag.png':
        case 'goal.png':
            s.zIndex = zIndex.tree;
            break;
        case 'ski01.png':
        case 'ski02.png':
        case 'ski03.png':
            s.zIndex = zIndex.player;
            break;
        case 'bear01.png':
        case 'bear02.png':
        case 'bear03.png':
            s.zIndex = zIndex.bear;
            break;
        default:
            break;
    }
    return s;
}


export class EntityFactory {

    private static instance: EntityFactory;
    private _player: Entity;
    private _pauseScreen: Entity;
    private _pauseButton: Entity;
    private _touchPointer: Entity;
    private _startCounter: Entity;
    private _flagsText: Entity;

    private debug = false;

    readonly engine: Engine;
    
    private constructor(engine: Engine) {
        this.engine = engine;
    }

    static getInstance(engine: Engine) {
        this.instance = this.instance === undefined
            ? new EntityFactory( engine )
            : this.instance;
        return this.instance;
    }

    createGrid(width: number, height: number) {
        const grid = this.engine.entityManager.createNewEntity();
        const pSprite = new PIXI.Sprite( PIXI.utils.TextureCache['transparent.png'] );
        const g = new PIXI.Graphics();

        g.lineStyle( 1, 0, 0.3 );
        for ( let x = 0; x < width; x += 64 ) {
            for ( let y = 0; y < height; y += 64 ) {
                g.drawRect( x, y, 63, 63 );
                const t = new PIXI.Text(`(x,y):\n    (${x/64}, ${y/64}),\n    (${x}, ${y})`);
                t.style = {
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontSize: '10px',
                    fill: 0x000000
                };
                t.x = x + 2;
                t.y = y + 2;
                g.addChild( t );
            }
        }

        pSprite.addChild( g );
        this.engine.pixiApp.stage.addChild( pSprite );

        let components: Component[] = [
            new SpriteComponent([pSprite], 0, true),
            new PositionComponent(0, 0, 'world')
        ];
        components.forEach( (component: Component) => this.engine.entityManager.addComponent(component, grid));

        return grid;
    }

    createPlayer(gridX: number, gridY: number): Entity {
        let player = this.engine.entityManager.createNewEntity();
        let pSprite01 = newSprite( 'ski01.png' );
        let pSprite02 = newSprite( 'ski02.png' );
        let pSprite03 = newSprite( 'ski03.png' );
        pSprite01.anchor.x = 0.5;
        pSprite01.anchor.y = 0.5;
        pSprite02.anchor.x = 0.5;
        pSprite02.anchor.y = 0.5;
        pSprite03.anchor.x = 0.5;
        pSprite03.anchor.y = 0.5;
        let x = gridX * 64 + 32;
        let y = gridY * 64 + 32;
        if (this.debug) {
            let g = new PIXI.Graphics();
            g.beginFill(0xFF0000, 0.2);
            g.drawRect(boxes.player.x, boxes.player.y, boxes.player.w, boxes.player.h);
            g.endFill();
            g.lineStyle(1, 0);
            g.drawRect(-32, -32, 64, 64);
            let text = new PIXI.Text(`${player.id}`, { fontSize: 15, stroke: 0 });
            pSprite01.addChild(g);
            pSprite01.addChild(text);
        }
        this.engine.pixiApp.stage.addChild( pSprite01 );
        this.engine.pixiApp.stage.addChild( pSprite02 );
        this.engine.pixiApp.stage.addChild( pSprite03 );
        
        let components: Component[] = [
            new TypeComponent( 'player' ),
            new SpriteComponent( [pSprite01, pSprite02, pSprite03], 0, true ),
            new PositionComponent( x, y, 'world' ),
            new DynamicsComponent( 100, Math.PI/2, { x:0, y:0 }, { x:0, y:0 }, { x:0, y: 0 } ),
            new RenderDynamicsRotation(),
            new HealthComponent( playerMaxHP ),
            new CollisionComponent( boxes.player ),
            new InputComponent()
        ];
        components.forEach( (component: Component) => this.engine.entityManager.addComponent(component, player));
        //console.log('player:', player, 'player components:', components);
        this._player = player;
        return player;
    }

    get player(): Entity {
        return this._player;
    }

    createBear(gridX: number, gridY: number) {
        const bear = this.engine.entityManager.createNewEntity();
        const x = gridX * 64 + 32;
        const y = gridY * 64 + 32;
        const pSprite01 = newSprite( 'bear01.png' );
        const pSprite02 = newSprite( 'bear02.png' );
        const pSprite03 = newSprite( 'bear03.png' );

        pSprite01.anchor.x = 0.5;
        pSprite01.anchor.y = 0.5;
        pSprite02.anchor.x = 0.5;
        pSprite02.anchor.y = 0.5;
        pSprite03.anchor.x = 0.5;
        pSprite03.anchor.y = 0.5;

        if (this.debug) {
            let g = new PIXI.Graphics();
            g.beginFill(0xFF0000, 0.2);
            g.drawRect(boxes.bear.x, boxes.bear.y, boxes.bear.w, boxes.bear.h);
            g.endFill();
            g.lineStyle(1, 0);
            g.drawRect(-32, -32, 64, 64);
            let text = new PIXI.Text(`${bear.id}`, { fontSize: 15, stroke: 0 });
            pSprite01.addChild(g);
            pSprite01.addChild(text);
        }
        
        this.engine.pixiApp.stage.addChild( pSprite01 );
        this.engine.pixiApp.stage.addChild( pSprite02 );
        this.engine.pixiApp.stage.addChild( pSprite03 );

        const animation1 = new SpriteAnimation();
        animation1.iterations = 1;
        animation1.loop = true;
        animation1.visibleWhenOff = true;
        animation1.off = true;
        animation1.steps = [
            { property: 'current', from: 2, to: 1, duration: 30, easing: 'linear'},
            { property: 'current', from: 1, to: 2, duration: 140, easing: 'linear'},
            { property: 'current', from: 2, to: 1, duration: 30, easing: 'linear'}
        ];

        this.engine.entityManager.addComponent( new TypeComponent( 'bear' ), bear );
        this.engine.entityManager.addComponent( new SpriteComponent( [pSprite01, pSprite02, pSprite03], 0, true ), bear );
        this.engine.entityManager.addComponent( new AnimationsComponent( [animation1] ) , bear );
        this.engine.entityManager.addComponent( new PositionComponent( x, y, 'world' ) , bear );
        this.engine.entityManager.addComponent( new CollisionComponent( boxes.bear ) , bear );
        //this.engine.entityManager.addComponent( new FollowComponent( this.player ) , bear );
        this.engine.entityManager.addComponent( new DynamicsComponent( 500, Math.PI/2, { x:0, y:0 }, { x:0, y:0 }, { x:0, y: 0 } ), bear );
        this.engine.entityManager.addComponent( new RenderDynamicsRotation(), bear );
        this.engine.entityManager.addComponent( new DestroyWhenNotOnScreenComponent(), bear );

        return bear;
    }

    createSnowball(gridX: number, gridY: number): Entity {
        const snowball = this.engine.entityManager.createNewEntity();
        const pSprite = newSprite( 'snowball01.png' );
        const x = gridX * 64 + 32;
        const y = gridY * 64 + 32;
        const accel = 20;
        const angle = Math.random()*Math.PI/2 + Math.PI/4;

        pSprite.anchor.x = 0.5;
        pSprite.anchor.y = 0.5;
        pSprite.zIndex = zIndex.snowball
        if (this.debug) {
            let g = new PIXI.Graphics();
            g.beginFill(0xFF0000, 0.2);
            g.drawRect(boxes.snowball.x, boxes.snowball.y, boxes.snowball.w, boxes.snowball.h);
            g.endFill();
            g.lineStyle(1, 0);
            g.drawRect(-32, -32, 64, 64);
            let text = new PIXI.Text(`${snowball.id}`, { fontSize: 15, stroke: 0 });
            pSprite.addChild(g);
            pSprite.addChild(text);
        }
        this.engine.pixiApp.stage.addChild( pSprite );

        const animation1 = new SpriteAnimation();
        animation1.iterations = 1;
        animation1.loop = true;
        animation1.off = false;
        animation1.visibleWhenOff = false;
        animation1.steps = [
            { property: 'rotation', from: 0, to: 2*Math.PI, duration: 1000, easing: 'linear' }
        ];
        
        let components: Component[] = [
            new TypeComponent( 'snowball' ),
            new SpriteComponent( [pSprite], 0, true ),
            new PositionComponent( x, y, 'world' ),
            new DynamicsComponent( 1000, angle, { x:0, y: 0 }, { x:0, y:0 }, { x: accel*Math.cos(angle), y: accel*Math.sin(angle) } ),
            new CollisionComponent( boxes.snowball ),
            new AnimationsComponent( [animation1] ),
            new DestroyWhenNotOnScreenComponent()
        ];
        components.forEach( (component: Component) => this.engine.entityManager.addComponent(component, snowball));

        return snowball;
    }

    createWorldRow(rowNum: number, row: string[], activeFlags: boolean[]) {
        //console.log('creating row ', rowNum, row, activeFlags);
        const entity = this.engine.entityManager.createNewEntity();
        const entities: Entity[] = [];
        const flags: PIXI.Sprite[] = [];
        const holder = newSprite( 'transparent.png' );

        holder.visible = true;
        holder.x = 0;
        holder.y = rowNum * 64;
        this.engine.pixiApp.stage.addChild( holder );

        let createdGoal = false;
        let prevFlag: PIXI.Sprite;
        for ( let col = 0; col < row.length; col++ ) {
            const cell = row[col];
            const floor = newSprite( 'snow01.png' );
            floor.x = col * 64;
            floor.y = 0;
            holder.addChild( floor );
            let sprite: PIXI.Sprite = undefined;
            let fnum: number = undefined;
            switch ( cell[0] ) {
                case 'T':
                    sprite = newSprite( tosscoin() === 0 ? 'tree01.png' : 'tree02.png' );
                    entities.push( this.createTreeCollision( col, rowNum ) );
                    break;
                case 'F':
                    fnum = parseInt( cell.split('_')[1] );
                    sprite = newSprite( 'flag.png' );
                    prevFlag = sprite;
                    flags.push( sprite );
                    break;
                case 'f':
                    fnum = parseInt( cell.split('_')[1] );
                    sprite = newSprite( 'flag.png' );
                    entities.push( this.createActivateFlagEvent( col, rowNum, cell, [prevFlag,sprite] ) );
                    break;
                case 'G':
                        sprite = newSprite( 'goal.png' );
                    if ( !createdGoal ) {
                        entities.push( this.createGoalCollisionEvent(col, rowNum) );
                        createdGoal = true;
                    }
                    break;
                case 'B':
                    let bear = this.createBear(col, rowNum);
                    entities.push( this.createActivateBearEvent( col, rowNum, bear ) );
                    break;
                default:
                    break;
            }
            if ( sprite ) {
                sprite.x = col * 64;
                sprite.y = 0;
                sprite.visible = true;
                holder.addChild( sprite );
                if ( fnum !== undefined && activeFlags[fnum] ) {
                    sprite.tint = 0x000000;
                }
            }
        }

        let components: Component[] = [
            new TypeComponent( 'floor' ),
            new SpriteComponent([holder], 0, true),
            new PositionComponent(0, rowNum*64, 'world')
        ];
        components.forEach( (component: Component) => this.engine.entityManager.addComponent(component, entity));

        entities.push( entity );
        return entities;
    }

    createFloor(gridX: number, gridY: number) {
        let floor = this.engine.entityManager.createNewEntity();
        let pSprite = newSprite( 'snow01.png' );
        pSprite.visible = true;
        let x = gridX * 64;
        let y = gridY * 64;
        this.engine.pixiApp.stage.addChild( pSprite );
        
        let components: Component[] = [
            new TypeComponent( 'floor' ),
            new SpriteComponent([pSprite], 0, true),
            new PositionComponent(x, y, 'world')
        ];
        components.forEach( (component: Component) => this.engine.entityManager.addComponent(component, floor));

        return floor;
    }

    createTree(gridX: number, gridY: number): Entity {
        const randInt = (max: number) => { return Math.floor(Math.random() * Math.floor(max)) };
        let tree = this.engine.entityManager.createNewEntity();
        let img = randInt(2) ? 'tree01.png' : 'tree02.png';
        let pSprite = newSprite( img );
        pSprite.visible = true;
        let x = gridX * 64;
        let y = gridY * 64;
        if (this.debug) {
            let g = new PIXI.Graphics();
            g.beginFill(0xFF0000, 0.2);
            g.drawRect(boxes.tree.x, boxes.tree.y, boxes.tree.w, boxes.tree.h);
            g.endFill();
            g.lineStyle(1, 0);
            g.drawRect(0, 0, 64, 64);
            let text = new PIXI.Text(`${tree.id}`, { fontSize: 15, stroke: 0 });
            text.x = 2;
            text.y = 50;
            pSprite.addChild(g);
            pSprite.addChild(text);
        }
        this.engine.pixiApp.stage.addChild( pSprite );
        
        let components: Component[] = [
            new TypeComponent( 'tree' ),
            new SpriteComponent([pSprite], 0, true),
            new PositionComponent(x, y, 'world'),
            new CollisionComponent(boxes.tree)
        ];
        components.forEach( (component: Component) => this.engine.entityManager.addComponent(component, tree));

        return tree;
    }

    createTreeCollision(gridX: number, gridY: number): Entity {
        let entity = this.engine.entityManager.createNewEntity();
        let x = gridX * 64;
        let y = gridY * 64;
        
        let components: Component[] = [
            new TypeComponent( 'tree' ),
            new PositionComponent(x, y, 'world'),
            new CollisionComponent(boxes.tree)
        ];
        components.forEach( (component: Component) => this.engine.entityManager.addComponent(component, entity));

        return entity;
    }

    createBorder(gridX: number, gridY: number): Entity {
        let border = this.engine.entityManager.createNewEntity();
        let img = 'tree02.png';
        
        const x = gridX * 64;
        const y = gridY * 64;
        
        let pSprite1 = new PIXI.Sprite( PIXI.utils.TextureCache[img] );
        let pSprite2 = new PIXI.Sprite( PIXI.utils.TextureCache[img] );
        let pSprite3 = new PIXI.Sprite( PIXI.utils.TextureCache[img] );

        pSprite1.visible = true;
        pSprite2.visible = true;
        pSprite3.visible = true;

        pSprite1.zIndex = zIndex.border;
        pSprite2.zIndex = zIndex.border+1;
        pSprite3.zIndex = zIndex.border+2;
        
        pSprite1.x = 0;
        pSprite2.x = 17;
        pSprite3.x = -17;
        
        pSprite1.y = -10;
        pSprite2.y = 0;
        pSprite3.y = 0;
        
        pSprite1.addChild(pSprite2);
        pSprite1.addChild(pSprite3);

        if (this.debug) {
            let g = new PIXI.Graphics();
            g.beginFill(0xFF0000, 0.2);
            g.drawRect(boxes.border.x, boxes.border.y, boxes.border.w, boxes.border.h);
            g.endFill();
            g.lineStyle(1, 0);
            g.drawRect(0, 0, 64, 64);
            let text = new PIXI.Text(`${border.id}`, { fontSize: 15, stroke: 0 });
            pSprite1.addChild(g);
            pSprite1.addChild(text);
        }

        this.engine.pixiApp.stage.addChild( pSprite1 );
        this.engine.pixiApp.stage.addChild( pSprite2 );
        this.engine.pixiApp.stage.addChild( pSprite3 );

        let components: Component[] = [
            new TypeComponent( 'border' ),
            new SpriteComponent([pSprite1], 0, true),
            new PositionComponent(x, y, 'world'),
            new CollisionComponent(boxes.border),
            new InputComponent()
        ];
        components.forEach( (component: Component) => this.engine.entityManager.addComponent(component, border));

        return border;
    }

    createFlag(gridX: number, gridY: number): Entity {
        let flag = this.engine.entityManager.createNewEntity();
        let pSprite = newSprite( 'flag.png' );
        pSprite.visible = true;
        let x = gridX * 64;
        let y = gridY * 64;
        this.engine.pixiApp.stage.addChild( pSprite );
        
        let components: Component[] = [
            new TypeComponent( 'flag' ),
            new SpriteComponent([pSprite], 0, true),
            new PositionComponent(x, y, 'world')
        ];
        components.forEach( (component: Component) => this.engine.entityManager.addComponent(component, flag));

        return flag;
    }

    createGoal(gridX: number, gridY: number): Entity {
        const randInt = (max: number) => { return Math.floor(Math.random() * Math.floor(max)) };
        let goal = this.engine.entityManager.createNewEntity();
        let pSprite = newSprite( 'goal.png' );
        pSprite.visible = true;
        let x = gridX * 64;
        let y = gridY * 64;
        this.engine.pixiApp.stage.addChild( pSprite );
        
        let components: Component[] = [
            new TypeComponent( 'goal' ),
            new SpriteComponent([pSprite], 0, true),
            new PositionComponent(x, y, 'world')
        ];
        components.forEach( (component: Component) => this.engine.entityManager.addComponent(component, goal));

        return goal;
    }

    createActivateFlagEvent(gridX: number, gridY: number, cell: string, sprites: PIXI.Sprite[]) {
        const activateFlag = this.engine.entityManager.createNewEntity();
        let pSprite = new PIXI.Sprite( PIXI.utils.TextureCache['transparent.png'] );
        if (this.debug) {
            let g = new PIXI.Graphics();
            g.beginFill(0xFF0000, 0.2);
            g.drawRect(boxes.activateFlagEvent.x, boxes.activateFlagEvent.y, boxes.activateFlagEvent.w, boxes.activateFlagEvent.h);
            g.endFill();
            g.lineStyle(1, 0);
            g.drawRect(0, 0, 64, 64);
            let text = new PIXI.Text(`${activateFlag.id}`, { fontSize: 15, stroke: 0 });
            text.x = 2;
            text.y = 50;
            pSprite.addChild(g);
            pSprite.addChild(text);
        }
        pSprite.zIndex = zIndex.tree;
        this.engine.pixiApp.stage.addChild( pSprite );
        let x = gridX * 64;
        let y = gridY * 64;
        const flag_id = parseInt( cell.split('_')[1] );

        let components: Component[] = [
            new TypeComponent( 'collision_event' ),
            new SpriteComponent( [pSprite], 0, true ),
            new PositionComponent(x, y, 'world'),
            new CollisionComponent( boxes.activateFlagEvent ),
            new CollisionEventComponent({ type: 'ActivateFlag', msg: { flag: flag_id, sprites: sprites }})
        ];
        components.forEach( (component: Component) => this.engine.entityManager.addComponent(component, activateFlag));

        return activateFlag;
    }

    createActivateBearEvent(gridX: number, gridY: number, bear: Entity) {
        const activateBear = this.engine.entityManager.createNewEntity();
        let pSprite = new PIXI.Sprite( PIXI.utils.TextureCache['transparent.png'] );
        if (this.debug) {
            let g = new PIXI.Graphics();
            g.beginFill(0xFF0000, 0.2);
            g.drawRect(boxes.activateBearEvent.x, boxes.activateBearEvent.y, boxes.activateBearEvent.w, boxes.activateBearEvent.h);
            g.endFill();
            g.lineStyle(1, 0);
            g.drawRect(0, 0, 64, 64);
            let text = new PIXI.Text(`${activateBear.id}`, { fontSize: 15, stroke: 0 });
            text.x = 2;
            text.y = 50;
            pSprite.addChild(g);
            pSprite.addChild(text);
        }
        pSprite.zIndex = zIndex.tree;
        this.engine.pixiApp.stage.addChild( pSprite );
        let x = gridX * 64;
        let y = gridY * 64;

        let components: Component[] = [
            new TypeComponent( 'collision_event' ),
            new SpriteComponent( [pSprite], 0, true ),
            new PositionComponent(x, y, 'world'),
            new CollisionComponent( boxes.activateBearEvent ),
            new CollisionEventComponent({ type: 'ActivateBear', msg: bear })
        ];
        components.forEach( (component: Component) => this.engine.entityManager.addComponent(component, activateBear));

        return activateBear;
    }

    createGoalCollisionEvent(gridX: number, gridY: number) {
        const goal = this.engine.entityManager.createNewEntity();
        let pSprite = new PIXI.Sprite( PIXI.utils.TextureCache['transparent.png'] );
        if (this.debug) {
            let g = new PIXI.Graphics();
            g.beginFill(0xFF0000, 0.2);
            g.drawRect(boxes.goalEvent.x, boxes.goalEvent.y, boxes.goalEvent.w, boxes.goalEvent.h);
            g.endFill();
            g.lineStyle(1, 0);
            g.drawRect(0, 0, 64, 64);
            let text = new PIXI.Text(`${goal.id}`, { fontSize: 15, stroke: 0 });
            text.x = 2;
            text.y = 50;
            pSprite.addChild(g);
            pSprite.addChild(text);
        }
        pSprite.zIndex = zIndex.tree;
        this.engine.pixiApp.stage.addChild( pSprite );
        let x = gridX * 64;
        let y = gridY * 64;

        let components: Component[] = [
            new TypeComponent( 'collision_event' ),
            new SpriteComponent( [pSprite], 0, true ),
            new PositionComponent(x, y, 'world'),
            new CollisionComponent( boxes.goalEvent ),
            new CollisionEventComponent({ type: 'GoalCollision', msg: undefined })
        ];
        components.forEach( (component: Component) => this.engine.entityManager.addComponent(component, goal));

        return goal;
    }

    createLevelText() {
        const levelText = this.engine.entityManager.createNewEntity();
        const pSprite = new PIXI.Sprite( PIXI.utils.TextureCache['transparent.png'] );
        const text = new PIXI.Text('');
        const world = World.getInstance( this.engine );
        
        text.x = 0;
        text.y = 0;
        text.style = {
            fontFamily: 'Arial Narrow, Helvetica, Arial, sans-serif',
            fontSize: '32px',
            fontWeight: 'bold',
            fill: 0xff0000,
            dropShadow: true,
            dropShadowDistance: 2
        };
        pSprite.zIndex = zIndex.ui;
        pSprite.addChild(text);
        this.engine.pixiApp.stage.addChild(pSprite);

        this.engine.entityManager.addComponent( new TypeComponent( 'text' ), levelText );
        this.engine.entityManager.addComponent( new SpriteComponent( [pSprite], 0, true ), levelText );
        this.engine.entityManager.addComponent( new PositionComponent( 1/2, 40, 'ratio' ) , levelText );
        this.engine.entityManager.addComponent( new TextFromProperty( world, 'currentLevelNumber', text, 'Level: ', '', 0 ) , levelText );

        return levelText;
    }

    createHPText(player: Entity) {
        const hpText = this.engine.entityManager.createNewEntity();
        //const pSprite = new PIXI.Sprite( PIXI.Loader.shared.resources['img/transparent.png'].texture );
        const pSprite = new PIXI.Sprite( PIXI.utils.TextureCache['transparent.png'] );
        const text = new PIXI.Text('');
        const health = this.engine.entityManager.getEntityComponentOfClass( HealthComponent, player );
        
        text.x = 0;
        text.y = 0;
        text.style = {
            fontFamily: 'Arial Narrow, Helvetica, Arial, sans-serif',
            fontSize: '32px',
            fontWeight: 'bold',
            fontVariant: 'small-caps',
            fill: 0xff0000,
            dropShadow: true,
            dropShadowDistance: 2
        };
        const format = (p: string | number ) => {
            let r = '';
            for ( let i = 0; i < p; i++ ) r = r + '♥'
            return r;
        };
        pSprite.zIndex = zIndex.ui;
        pSprite.addChild(text);
        this.engine.pixiApp.stage.addChild(pSprite);

        this.engine.entityManager.addComponent( new TypeComponent( 'text' ), hpText );
        this.engine.entityManager.addComponent( new SpriteComponent( [pSprite], 0, true ), hpText );
        this.engine.entityManager.addComponent( new PositionComponent( 40, 40, 'screen' ) , hpText );
        this.engine.entityManager.addComponent( new TextFromProperty( health, 'hp', text, '', '', 0, format ) , hpText );

        return hpText;
    }

    createFlagsText() {
        const flagsText = this.engine.entityManager.createNewEntity();
        const pSprite = new PIXI.Sprite( PIXI.utils.TextureCache['flag.png'] );
        const text = new PIXI.Text('');
        const world = World.getInstance( this.engine );
        
        text.x = 64;
        text.y = 0;
        text.style = {
            fontFamily: 'Arial Narrow, Helvetica, Arial, sans-serif',
            fontSize: '64px',
            fontWeight: 'bold',
            fontVariant: 'small-caps',
            fill: 0xff0000,
            dropShadow: true,
            dropShadowDistance: 2
        };
        const format = (f: any) => {
            let num = 0;
            world.activeFlags.map(f => { if (f) num++; });
            num = world.currentLevel.flagNum - num;
            return num + '';
        };
        pSprite.zIndex = zIndex.ui;
        pSprite.width = 32;
        pSprite.height = 32;
        pSprite.addChild(text);
        this.engine.pixiApp.stage.addChild(pSprite);

        const animation1 = new SpriteAnimation();
        animation1.iterations = 2;
        animation1.loop = false;
        animation1.visibleWhenOff = true;
        animation1.off = true;
        animation1.steps = [
            { property: 'scale', from: 0.5, to: 2.0, duration: 100, easing: 'in-cubic' },
            { property: 'scale', from: 2.0, to: 0.5, duration: 100, easing: 'out-elastic' }
        ];

        this.engine.entityManager.addComponent( new TypeComponent( 'text' ), flagsText );
        this.engine.entityManager.addComponent( new SpriteComponent( [pSprite], 0, true ), flagsText );
        this.engine.entityManager.addComponent( new PositionComponent( 40, 72, 'screen' ) , flagsText );
        this.engine.entityManager.addComponent( new TextFromProperty( world, 'activeFlags', text, '⨉ ', '', 0, format ) , flagsText );
        this.engine.entityManager.addComponent( new AnimationsComponent( [animation1] ) , flagsText );

        this._flagsText = flagsText;
        return flagsText;
    }

    get flagsText() {
        return this._flagsText;
    }

    createStatisticsText() {
        const hpText = this.engine.entityManager.createNewEntity();
        const pSprite = new PIXI.Sprite( PIXI.utils.TextureCache['transparent.png'] );
        const text = new PIXI.Text('');
        
        text.x = 0;
        text.y = 0;
        text.style = {
            fontFamily: 'Arial Narrow, Helvetica, Arial, sans-serif',
            fontSize: '14px',
            fill: 0x000000,
            dropShadow: true,
            dropShadowColor: 0xaaaaaa,
            dropShadowDistance: 2
        };
        const format = (statistics: any) => {
            let r = '';
            r = r + 'loopInterval: '     + parseFloat( statistics.loopIntervalAverageTime ).toFixed( 2 );
            r = r + ', loopIteration: '  + parseFloat( statistics.loopIterationAverageTime ).toFixed( 2 );
            r = r + ', systemsCleanup: ' + parseFloat( statistics.systemsCleanupAverageTime ).toFixed( 2 );
            r = r + ', systemsRender: '  + parseFloat( statistics.systemsRenderAverageTime ).toFixed( 2 );
            r = r + ', systemsUpdate: '  + parseFloat( statistics.systemsUpdateAverageTime ).toFixed( 2 );
            return r;
        };
        const format2 = (statistics: any) => {
            let r = '';
            r = r + 'loopInterval: '     + statistics.loopIntervalAverageTime;
            r = r + ', loopIteration: '  + statistics.loopIterationAverageTime;
            r = r + ', systemsCleanup: ' + statistics.systemsCleanupAverageTime;
            r = r + ', systemsRender: '  + statistics.systemsRenderAverageTime;
            r = r + ', systemsUpdate: '  + statistics.systemsUpdateAverageTime;
            return r;
        };
        pSprite.zIndex = zIndex.ui;
        pSprite.addChild(text);
        this.engine.pixiApp.stage.addChild(pSprite);

        this.engine.entityManager.addComponent( new TypeComponent( 'text' ), hpText );
        this.engine.entityManager.addComponent( new SpriteComponent( [pSprite], 0, true ), hpText );
        this.engine.entityManager.addComponent( new PositionComponent( 40, -40, 'screen' ) , hpText );
        this.engine.entityManager.addComponent( new TextFromProperty( this.engine, 'statistics', text, '', '', 500, format ) , hpText );

        return hpText;
    }

    createHitFlashAnimation(player: Entity) {
        let hitFlash = this.engine.entityManager.createNewEntity();
        //let pSprite = new PIXI.Sprite( PIXI.Loader.shared.resources['img/red.png'].texture );
        let pSprite = new PIXI.Sprite( PIXI.utils.TextureCache['red.png'] );
        pSprite.visible = true;
        pSprite.zIndex = zIndex.hitFlash;
        pSprite.width = this.engine.pixiApp.renderer.width*2;
        pSprite.height = this.engine.pixiApp.renderer.height*2;
        this.engine.pixiApp.stage.addChild(pSprite);

        const animation = new SpriteAnimation();
        animation.iterations = 1;
        animation.loop = false;
        animation.off = false;
        animation.visibleWhenOff = false;
        animation.steps = [
            { property: 'alpha', from: 0.5, to: 0, duration: 300, easing: 'out-in-quartic'}
        ];

        this.engine.entityManager.addComponent( new TypeComponent( 'hit_flash' ), hitFlash );
        this.engine.entityManager.addComponent( new PositionComponent(0, 0, 'screen'), hitFlash );
        this.engine.entityManager.addComponent( new SpriteComponent([pSprite], 0, true), hitFlash );
        this.engine.entityManager.addComponent( new AnimationsComponent( [animation] ), hitFlash );
        this.engine.entityManager.addComponent( new DestroyWhenAnimationOffComponent(), hitFlash );

        return hitFlash;
    }

    createTouchPointer() {
        const touch = this.engine.entityManager.createNewEntity();

        let components: Component[] = [
            new TypeComponent( 'touch_pointer' ),
            new PositionComponent( 0, 0, 'screen' ),
            new CollisionComponent( boxes.touch )
        ];
        components.forEach( (component: Component) => this.engine.entityManager.addComponent(component, touch) );

        this._touchPointer = touch;
        return touch;
    }

    get touchPointer() {
        return this._touchPointer;
    }

    createPauseButton() {
        const pause = this.engine.entityManager.createNewEntity();
        //const pSprite = new PIXI.Sprite( PIXI.Loader.shared.resources['img/transparent.png'].texture );
        const pSprite = new PIXI.Sprite( PIXI.utils.TextureCache['transparent.png'] );
        const text = new PIXI.Text('☰');
        
        text.x = 0;
        text.y = 0;
        text.anchor.x = 0.5;
        text.anchor.y = 0.5;
        text.style = {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '32px',
            fontWeight: 'bold',
            fontVariant: 'small-caps',
            fill: 0xff0000,
            dropShadow: true,
            dropShadowDistance: 2,
            dropShadowColor: 0x000000
        };
        pSprite.zIndex = zIndex.ui;
        pSprite.addChild(text);
        pSprite.anchor.x = 0.5;
        pSprite.anchor.y = 0.5;
        pSprite.interactive = true;
        pSprite.cursor = 'pointer';
        this.engine.pixiApp.stage.addChild(pSprite);

        const animation = new SpriteAnimation();
        animation.iterations = 1;
        animation.loop = true;
        animation.off = false;
        animation.visibleWhenOff = true;
        animation.steps = [
            { property: 'rotation', from: 0, to: 2*Math.PI, duration: 1500, easing: 'out-elastic'},
            { property: 'alpha', from: 1, to: 1, duration: 10000, easing: 'linear'},
        ];

        this.engine.entityManager.addComponent( new TypeComponent( 'pause_button' ), pause );
        this.engine.entityManager.addComponent( new SpriteComponent( [pSprite], 0, true ), pause );
        this.engine.entityManager.addComponent( new PositionComponent( -56, 56, 'screen' ) , pause );
        this.engine.entityManager.addComponent( new ButtonComponent( 64, 64, {type:'Pause', msg:undefined} ) , pause );
        this.engine.entityManager.addComponent( new AnimationsComponent( [animation] ) , pause );

        this._pauseButton = pause;
        return pause;
    }

    get pauseButton() {
        return this._pauseButton;
    }

    createPauseScreen() {
        const pause = this.engine.entityManager.createNewEntity();
        const width = this.engine.pixiApp.renderer.width;
        const height = this.engine.pixiApp.renderer.height;
        //const pSprite = new PIXI.Sprite( PIXI.Loader.shared.resources['img/white.png'].texture );
        const pSprite = new PIXI.Sprite( PIXI.utils.TextureCache['white.png'] );
        pSprite.zIndex = zIndex.ui;
        pSprite.width = width*2;
        pSprite.height = height*2;
        pSprite.anchor.x = 0.5;
        pSprite.anchor.y = 0.5;
        pSprite.x = width/2;
        pSprite.y = height/2;
        pSprite.tint = 0x000000;
        pSprite.visible = true;
        pSprite.alpha = 0;
        this.engine.pixiApp.stage.addChild(pSprite);
        
        const animation1 = new SpriteAnimation();
        animation1.iterations = 1;
        animation1.loop = false;
        animation1.visibleWhenOff = true;
        animation1.off = false;
        animation1.steps = [
            { property: 'alpha', from: 0, to: 0.7, duration: 800, easing: 'out-cubic' }
        ];
        
        const animation2 = new SpriteAnimation();
        animation2.iterations = 1;
        animation2.loop = true;
        animation2.visibleWhenOff = true;
        animation2.off = false;
        animation2.steps = [
            { property: 'tint', from: 0x000000, to: 0x222222, duration: 1500, easing: 'in-cubic' },
            { property: 'tint', from: 0x222222, to: 0x000000, duration: 1500, easing: 'out-cubic' }
        ];
        
        this.engine.entityManager.addComponent( new TypeComponent( 'ui_element' ), pause );
        this.engine.entityManager.addComponent( new SpriteComponent([pSprite], 0, true), pause );
        //this.engine.entityManager.addComponent( new PositionComponent(0, 0, width/2, height/2, true), pause );
        this.engine.entityManager.addComponent( new PositionComponent(1/2, 1/2, 'ratio'), pause );
        this.engine.entityManager.addComponent( new AnimationsComponent( [animation1, animation2] ), pause );
        
        this._pauseScreen = pause;
        return pause;
    }

    get pauseScreen() {
        return this._pauseScreen;
    }

    createStartCounter() {
        const counter = this.engine.entityManager.createNewEntity();
        //const pSprite = new PIXI.Sprite( PIXI.Loader.shared.resources['img/transparent.png'].texture );
        const pSprite = new PIXI.Sprite( PIXI.utils.TextureCache['transparent.png'] );
        const text = new PIXI.Text('');
        
        text.x = 0;
        text.y = 0;
        text.anchor.x = 0.5;
        text.anchor.y = 0.5;
        text.style = {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '400px',
            fontWeight: 'bold',
            fontVariant: 'small-caps',
            fill: 0xff0000,
            dropShadow: true,
            dropShadowDistance: 2,
            dropShadowColor: 0x000000
        };

        pSprite.zIndex = zIndex.ui + 5;
        pSprite.addChild(text);
        pSprite.anchor.x = 0.5;
        pSprite.anchor.y = 0.5;
        pSprite.interactive = true;
        pSprite.cursor = 'pointer';
        this.engine.pixiApp.stage.addChild(pSprite);

        const counterComponent = new CounterComponent( 3 );
        const format = (s: string | number) => {
            if ( s === 0 ) {
                return 'Go!';
            } else {
                return s + '';
            }
        };

        const animationDuration = 600;

        const scaleAnimation = new SpriteAnimation();
        scaleAnimation.iterations = 1;
        scaleAnimation.loop = false;
        scaleAnimation.off = false;
        scaleAnimation.visibleWhenOff = true;
        scaleAnimation.steps = [
            { property: 'scale', from: 2, to: 0, duration: animationDuration, easing: 'out-in-quartic'}
        ];
        scaleAnimation.onFinishMessage = { type: 'StartCounterDecrease', msg: counterComponent };

        const alphaAnimation = new SpriteAnimation();
        alphaAnimation.iterations = 1;
        alphaAnimation.loop = false;
        alphaAnimation.off = false;
        alphaAnimation.visibleWhenOff = true;
        alphaAnimation.steps = [
            { property: 'alpha', from: 0, to: 1, duration: animationDuration/2, easing: 'out-cubic'},
            { property: 'alpha', from: 1, to: 0, duration: animationDuration/2, easing: 'in-cubic'}
        ];

        this.engine.entityManager.addComponent( new TypeComponent( 'start_counter' ), counter );
        this.engine.entityManager.addComponent( new SpriteComponent( [pSprite], 0, true ), counter );
        this.engine.entityManager.addComponent( new TextFromProperty( counterComponent, 'counter', text, '', '', 0, format ), counter );
        this.engine.entityManager.addComponent( new PositionComponent( 1/2, 1/2, 'ratio' ) , counter );
        this.engine.entityManager.addComponent( new AnimationsComponent( [scaleAnimation, alphaAnimation] ) , counter );
        this._startCounter = counter;
        return counter;
    }

    get startCounter() {
        return this._startCounter;
    }

    createLogo() {
        const logo = this.engine.entityManager.createNewEntity();
        //const pSprite = new PIXI.Sprite( PIXI.Loader.shared.resources['img/logo.png'].texture );
        const pSprite = new PIXI.Sprite( PIXI.utils.TextureCache['logo.png'] );

        pSprite.zIndex = zIndex.ui + 5;
        pSprite.anchor.x = 0.5;
        pSprite.anchor.y = 0.5;
        this.engine.pixiApp.stage.addChild(pSprite);

        const animation1 = new SpriteAnimation();
        animation1.iterations = 1;
        animation1.loop = true;
        animation1.visibleWhenOff = true;
        animation1.off = false;
        animation1.steps = [
            { property: 'scale', from: 0.5, to: 0.5, duration: 1500, easing: 'out-cubic' },
            { property: 'scale', from: 0.5, to: 1.0, duration: 300, easing: 'out-in-quartic' },
            { property: 'scale', from: 1.0, to: 0.5, duration: 100, easing: 'out-cubic' }
        ];

        this.engine.entityManager.addComponent( new TypeComponent( 'ui_element' ), logo );
        this.engine.entityManager.addComponent( new SpriteComponent( [pSprite], 0, true ), logo );
        this.engine.entityManager.addComponent( new PositionComponent( 1/2, 1/4, 'ratio' ) , logo );
        this.engine.entityManager.addComponent( new AnimationsComponent( [animation1] ), logo );

        return logo;
    }

    createLogoPlayerDied() {
        const logo = this.engine.entityManager.createNewEntity();
        //const pSprite = new PIXI.Sprite( PIXI.Loader.shared.resources['img/dead.png'].texture );
        const pSprite = new PIXI.Sprite( PIXI.utils.TextureCache['dead.png'] );

        pSprite.zIndex = zIndex.ui + 5;
        pSprite.anchor.x = 0.5;
        pSprite.anchor.y = 0.5;
        this.engine.pixiApp.stage.addChild(pSprite);

        const animation1 = new SpriteAnimation();
        animation1.iterations = 1;
        animation1.loop = true;
        animation1.visibleWhenOff = true;
        animation1.off = false;
        animation1.steps = [
            { property: 'scale', from: 0.5, to: 0.5, duration: 1500, easing: 'out-cubic' },
            { property: 'scale', from: 0.5, to: 1.0, duration: 300, easing: 'out-in-quartic' },
            { property: 'scale', from: 1.0, to: 0.5, duration: 100, easing: 'out-cubic' }
        ];

        this.engine.entityManager.addComponent( new TypeComponent( 'ui_element' ), logo );
        this.engine.entityManager.addComponent( new SpriteComponent( [pSprite], 0, true ), logo );
        this.engine.entityManager.addComponent( new PositionComponent( 1/2, 1/4, 'ratio' ) , logo );
        this.engine.entityManager.addComponent( new AnimationsComponent( [animation1] ), logo );

        return logo;
    }

    createLogoGoalReached() {
        const logo = this.engine.entityManager.createNewEntity();
        const pSprite = new PIXI.Sprite( PIXI.utils.TextureCache['ski03.png'] );

        pSprite.zIndex = zIndex.ui + 5;
        pSprite.anchor.x = 0.5;
        pSprite.anchor.y = 0.5;
        //pSprite.scale.x = 3;
        //pSprite.scale.y = 3;
        this.engine.pixiApp.stage.addChild(pSprite);

        const animation1 = new SpriteAnimation();
        animation1.iterations = 1;
        animation1.loop = true;
        animation1.visibleWhenOff = true;
        animation1.off = false;
        animation1.steps = [
            { property: 'rotation', from: 0, to: 2*Math.PI, duration: 1000, easing: 'out-cubic' },
            { property: 'alpha', from: 1, to: 1, duration: 10000, easing: 'linear' }
        ];

        const animation2 = new SpriteAnimation();
        animation2.iterations = 1;
        animation2.loop = false;
        animation2.visibleWhenOff = true;
        animation2.off = false;
        animation2.steps = [
            { property: 'alpha', from: 0, to: 1, duration: 1000, easing: 'out-cubic' }
        ];

        const animation3 = new SpriteAnimation();
        animation3.iterations = 1;
        animation3.loop = false;
        animation3.visibleWhenOff = true;
        animation3.off = false;
        animation3.steps = [
            { property: 'scale', from: 0, to: 3, duration: 1000, easing: 'out-cubic' }
        ];

        this.engine.entityManager.addComponent( new TypeComponent( 'ui_element' ), logo );
        this.engine.entityManager.addComponent( new SpriteComponent( [pSprite], 0, true ), logo );
        this.engine.entityManager.addComponent( new PositionComponent( 1/2, 1/4, 'ratio' ) , logo );
        this.engine.entityManager.addComponent( new AnimationsComponent( [animation1, animation2, animation3] ), logo );

        return logo;
    }

    createResumeButton() {
        return this.createButton( 'button-pause.png', 1/2, 1/2+1/10, 'ratio', {type: 'Pause', msg: undefined} );
    }

    createRestartButton() {
        return this.createButton( 'button-restart.png', 1/2, 1/2+1/5, 'ratio', {type: 'Reset', msg: undefined} );
    }

    createNextLevelButton() {
        return this.createButton( 'button-nextlevel.png', 1/2, 1/2+1/5, 'ratio', {type: 'NextLevel', msg: undefined} );
    }

    createFullscreenButton() {
        return this.createButton( 'button-fullscreen.png', 1/2, 1/2+3/10, 'ratio', {type: 'Fullscreen', msg: undefined} );
    }

    private createButton(texture: string, x:number, y: number, coordType: 'world' | 'screen' | 'ratio', event: GameEvent) {
        const button = this.engine.entityManager.createNewEntity();
        //const pSprite = new PIXI.Sprite( PIXI.Loader.shared.resources[texture].texture );
        const pSprite = new PIXI.Sprite( PIXI.utils.TextureCache[texture] );
        const w = 200;
        const h = 40;

        pSprite.zIndex = zIndex.ui + 5;
        pSprite.anchor.x = 0.5;
        pSprite.anchor.y = 0.5;
        pSprite.interactive = true;
        pSprite.cursor = 'pointer';
        this.engine.pixiApp.stage.addChild(pSprite);

        this.engine.entityManager.addComponent( new TypeComponent( 'button' ), button );
        this.engine.entityManager.addComponent( new SpriteComponent( [pSprite], 0, true ), button );
        this.engine.entityManager.addComponent( new PositionComponent( x, y, coordType ) , button );
        this.engine.entityManager.addComponent( new ButtonComponent( w, h, event ) , button );

        return button;
    }

}
