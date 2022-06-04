import * as PIXI from 'pixi.js';
import { Entity, System, Engine, GameEvent } from 'fosfeno';
import { SpriteComponent, AnimationsComponent, DestroyWhenAnimationOffComponent, HealthComponent, TypeComponent, CollisionEventComponent, FollowComponent, DestroyWhenNotOnScreenComponent, PositionComponent } from '../components';
import { EntityFactory, World } from '../state';
import { Camera } from '../graphics';


const max = (a: number, b: number) => { return a > b ? a : b };


export class HealthSystem extends System {

    private player: Entity;
    private factory: EntityFactory;
    private subscriptions: [string, (e:GameEvent)=>void][];
    private playerCollisionTimestamp: number;
    private playerCollisionThrottle = 500;

    constructor(engine: Engine, player: Entity) {
        super(engine);
        this.player = player;
        this.factory = EntityFactory.getInstance( engine );
        this.subscriptions = [
            ['Collision', this.onCollision.bind(this)],
            ['ActivateBear', this.onActivateBear.bind(this)],
            ['ActivateFlag', this.onActivateFlag.bind(this)],
            ['GoalCollision', this.onGoalCollision.bind(this)],
        ];
    }

    update(delta: number) {
        const now = Date.now();
        const world = World.getInstance( this.engine );
        if ( world.currentLevelNumber >= 8 ) {
            const threshold = 60 + 4*(world.currentLevelNumber - 8);
            if ( now % max(180, threshold) === 0 ) {
                const screenWidth = this.engine.pixiApp.renderer.width;
                const camera = new Camera( this.engine );
                const cameraPos = world.toGrid({
                    x: camera.x + screenWidth*Math.random(), 
                    y: camera.y, 
                    type: 'world'
                });
                this.factory.createSnowball( cameraPos.x, cameraPos.y );
            }
        }
    }

    stage(): void {
        this.subscribeToEvents( this.subscriptions );
    }
    
    unstage(): void {
        this.unsubscribeToEvents( this.subscriptions );
    }

    cleanup() {}

    destroy() {}

    private onCollision(event: GameEvent) {
        const type1 = <TypeComponent> this.engine.entityManager.getEntityComponentOfClass( TypeComponent, event.msg[0].entity );
        const type2 = <TypeComponent> this.engine.entityManager.getEntityComponentOfClass( TypeComponent, event.msg[1].entity );
        const isPlayer = type1.type === 'player' || type2.type === 'player';
        const isBear = type1.type === 'bear' || type2.type === 'bear';
        const isTree = type1.type === 'tree' || type2.type === 'tree';
        const isSnowball = type1.type === 'snowball' || type2.type === 'snowball';
        const isBorder = type1.type === 'border' || type2.type === 'border';
        const isEvent = type1.type === 'collision_event' || type2.type === 'collision_event';

        if ( isPlayer && (isTree || isBorder || isBear || isSnowball || isEvent ) ) {
            const now = Date.now();
            
            if ( isBorder || isBear || isTree || isSnowball ) {
                if (this.playerCollisionTimestamp) {
                    if ( now - this.playerCollisionTimestamp < this.playerCollisionThrottle ) return;
                }
                this.playerCollisionTimestamp = Date.now();
                const health = <HealthComponent> this.engine.entityManager.getEntityComponentOfClass( HealthComponent, this.player );
                health.hp--;
                if ( health.hp > 0 ) {
                    let animation = this.factory.createHitFlashAnimation(this.player);
                    this.publishEvent({ type: 'PlayerHit', msg: event.msg });
                } else {
                    this.publishEvent({ type: 'PlayerDied', msg: this.player });
                }
            }

            if ( isEvent ) {
                if ( type1.type === 'collision_event' ) {
                    const ev1 = <CollisionEventComponent> this.engine.entityManager.getEntityComponentOfClass( CollisionEventComponent, event.msg[0].entity );
                    this.publishEvent( ev1.event );
                }
                if ( type2.type === 'collision_event' ) {
                    const ev2 = <CollisionEventComponent> this.engine.entityManager.getEntityComponentOfClass( CollisionEventComponent, event.msg[1].entity );
                    this.publishEvent( ev2.event );
                }
            }
        }
    }

    private onActivateBear(event: GameEvent) {
        const bear = <Entity> event.msg;
        const follow = <FollowComponent> this.getEntityComponentOfClass( FollowComponent, bear );
        if ( !follow ) {
            this.engine.entityManager.addComponent( new FollowComponent( this.factory.player ), bear );
            const animations = <AnimationsComponent> this.getEntityComponentOfClass( AnimationsComponent, bear );
            animations.animations.forEach(a => { a.off = false });
        }
    }

    private onActivateFlag(event: GameEvent) {
        const world = World.getInstance( this.engine );
        const flag = event.msg.flag;
        world.activeFlags[flag] = true;
        event.msg.sprites.forEach( (s: PIXI.Sprite) => { s.tint = 0x000000 } );
    }

    private onGoalCollision(event: GameEvent) {
        const factory = EntityFactory.getInstance( this.engine );
        const world = World.getInstance( this.engine );
        let allActive = world.activeFlags.reduce((p,c)=> {return p && c});
        //console.log( allActive, world.activeFlags)
        if ( allActive ) {
            this.publishEvent({ type: 'GoalReached', msg: undefined });
        } else {
            const anim = <AnimationsComponent> this.getEntityComponentOfClass( AnimationsComponent, factory.flagsText );
            if ( anim.animations[0].off === true ) anim.animations[0].off = false;
        }
    }

}


export class EntityDeleteSystem extends System {

    constructor(engine: Engine) {
        super(engine);
    }

    update(delta: number) {
        const world = World.getInstance( this.engine );
        const screenWidth = this.engine.pixiApp.renderer.width;
        const screenHeight = this.engine.pixiApp.renderer.height;
        let animationOffEntities = this.getEntitiesBySignature( [DestroyWhenAnimationOffComponent, AnimationsComponent, SpriteComponent] );
        animationOffEntities.forEach((entity: Entity, destroy: DestroyWhenAnimationOffComponent, animations: AnimationsComponent, sprite: SpriteComponent) => {
            animations.animations.forEach(animation => {
                if ( animation.off ) {
                    this.publishEvent({ type: 'DeleteEntity', msg: entity});
                    this.engine.pixiApp.stage.removeChild( sprite.sprites[0] );
                    sprite.sprites[0].destroy();
                    this.engine.entityManager.removeEntity( entity );
                }
            });
        });

        let offScreenEntities = this.getEntitiesBySignature( [DestroyWhenNotOnScreenComponent, PositionComponent] );
        offScreenEntities.forEach((entity: Entity, offScreen: DestroyWhenAnimationOffComponent, position: PositionComponent) => {
            const p = world.toScreen( position );
            if ( p.y < -64*2 || p.y > screenHeight + 64*2 ) {
                this.engine.entityManager.removeEntity( entity );
            }
        });
    }

    stage(): void {
    }
    
    unstage(): void {
    }

    cleanup() {}

    destroy() {}
}