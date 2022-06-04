import * as PIXI from 'pixi.js';
import { System, Engine, GameEvent, Entity } from 'fosfeno';
import { SpriteComponent, AnimationsComponent, CounterComponent, ButtonComponent, PositionComponent } from '../components';
import { EntityFactory, World } from '../state';


export class UISystem extends System {

    private factory: EntityFactory;
    private world: World;

    constructor(engine: Engine) {
        super( engine );
        this.factory = EntityFactory.getInstance( engine );
        this.world = World.getInstance( engine );
    }
    
    update(delta: number): void {
    }

    cleanup(): void {
    }

    stage(): void {
        this.subscribeToEvents([
            [ 'TouchStart', this.onTouchStart.bind(this) ],
            [ 'TouchMove',  this.onTouchMove.bind(this) ],
            [ 'TouchEnd',   this.onTouchEnd.bind(this) ],
            [ 'MouseMove',  this.onMouseMove.bind(this) ],
            [ 'MouseClick',      this.onClick.bind(this) ],
        ]);
    }

    unstage(): void {
        this.unsubscribeToEvent( 'TouchStart', this.onTouchStart.bind(this) );
        this.unsubscribeToEvent( 'TouchMove',  this.onTouchMove.bind(this) );
        this.unsubscribeToEvent( 'TouchEnd',   this.onTouchEnd.bind(this) );
        this.unsubscribeToEvent( 'MouseMove',  this.onMouseMove.bind(this) );
        this.unsubscribeToEvent( 'MouseClick',      this.onClick.bind(this) );
    }

    destroy(): void {
        //const buttons = this.getEntitiesBySignature([ButtonComponent, SpriteComponent, PositionComponent], []);
        //buttons.forEach((entity: Entity, button: ButtonComponent, sprite: SpriteComponent, position: PositionComponent) => {
        //    if ( entity.id !== this.factory.pauseButton.id ) {
        //        sprite.sprites.forEach(s => { s.destroy() });
        //        this.engine.entityManager.removeEntity( entity );
        //    }
        //});
    }

    private testCollision(pointer: PositionComponent, button: ButtonComponent, sprite: SpriteComponent, position: PositionComponent) {
        const ptr = this.world.toScreen( pointer );
        const pos = this.world.toScreen( position );
        return ptr.x >= pos.x - button.width * sprite.sprites[0].anchor.x
           &&  ptr.x <= pos.x + button.width * (1 - sprite.sprites[0].anchor.x)
           &&  ptr.y >= pos.y - button.height * sprite.sprites[0].anchor.y
           &&  ptr.y <= pos.y + button.height * (1 - sprite.sprites[0].anchor.y);
    }

    private onTouchStart() {
        const pointer = <PositionComponent> this.engine.entityManager.getEntityComponentOfClass( PositionComponent, this.factory.touchPointer );
        const buttons = this.getEntitiesBySignature([ButtonComponent, SpriteComponent, PositionComponent], []);
        buttons.forEach((entity: Entity, button: ButtonComponent, sprite: SpriteComponent, position: PositionComponent) => {
            const collide = this.testCollision(pointer, button, sprite, position)
            button.touchStarted = collide;
            if ( collide ) sprite.sprites[0].tint = 0xFF0000;
        });
    }

    private onTouchMove() {
        ;
    }

    private onTouchEnd() {
        const pointer = <PositionComponent> this.engine.entityManager.getEntityComponentOfClass( PositionComponent, this.factory.touchPointer );
        const buttons = this.getEntitiesBySignature([ButtonComponent, SpriteComponent, PositionComponent], []);
        buttons.forEach((entity: Entity, button: ButtonComponent, sprite: SpriteComponent, position: PositionComponent) => {
            const collide = this.testCollision(pointer, button, sprite, position)
            button.touchStarted = collide;
            if ( collide && button.touchStarted ) {
                //console.log('collide: ', pointer, button, '\nemmitting: ', button.event);
                this.publishEvent( button.event );
            }
            button.touchStarted = false;
            sprite.sprites[0].tint = 0xffffff;
            //console.log(collide, pointer, button);
        });
    }

    private onMouseMove(event: GameEvent) {
        const buttons = this.getEntitiesBySignature([ButtonComponent, SpriteComponent, PositionComponent], []);
        const pointer: PositionComponent = {
            x: event.msg.mouseEvent.clientX,
            y: event.msg.mouseEvent.clientY,
            type: 'screen'
        };
        buttons.forEach((entity: Entity, button: ButtonComponent, sprite: SpriteComponent, position: PositionComponent) => {
            const collide = this.testCollision(pointer, button, sprite, position)
            if ( collide ) sprite.sprites[0].tint = 0xFF0000;
            else sprite.sprites[0].tint = 0xffffff;
            //console.log(collide, pointer, button);
        });
    }

    private onClick(event: GameEvent) {
        const buttons = this.getEntitiesBySignature([ButtonComponent, SpriteComponent, PositionComponent], []);
        const pointer: PositionComponent = {
            x: event.msg.mouseEvent.clientX,
            y: event.msg.mouseEvent.clientY,
            type: 'screen'
        };
        buttons.forEach((entity: Entity, button: ButtonComponent, sprite: SpriteComponent, position: PositionComponent) => {
            const collide = this.testCollision(pointer, button, sprite, position)
            if ( collide ) {
                //console.log('collide: ', pointer, button, '\nemmitting: ', button.event);
                this.publishEvent( button.event );
            }
            sprite.sprites[0].tint = 0xffffff;
            //console.log(collide, pointer, button);
        });
    }

}


export class StartLevelUISystem extends System {

    private factory: EntityFactory;
    private world: World;

    constructor(engine: Engine) {
        super( engine );
        this.factory = EntityFactory.getInstance( engine );
        this.world = World.getInstance( engine );
    }
    
    update(delta: number): void {
    }

    cleanup(): void {
    }

    stage(): void {
        this.subscribeToEvents([
            ['StartCounterDecrease', this.onStartCounterDecrease.bind(this)]
        ]);
    }

    unstage(): void {
        this.unsubscribeToEvent( 'StartCounterDecrease', this.onStartCounterDecrease.bind(this) );
    }

    destroy(): void {
        const sprite = <SpriteComponent> this.engine.entityManager.getEntityComponentOfClass( SpriteComponent, this.factory.startCounter );
        sprite.sprites[0].destroy();
        this.engine.entityManager.removeEntity( this.factory.startCounter );
    }

    private onStartCounterDecrease(event: GameEvent) {
        const counter = <CounterComponent> event.msg;
        if ( counter.counter === 0 ) {
            this.publishEvent( {type: 'StartLevel', msg: undefined} );
        } else {
            const animations = <AnimationsComponent> this.engine.entityManager.getEntityComponentOfClass( AnimationsComponent, this.factory.startCounter );
            animations.animations.forEach(animation => {
                animation.off = false;
                animation.startTime = undefined;
            });
            counter.counter--;
        }
    }
}