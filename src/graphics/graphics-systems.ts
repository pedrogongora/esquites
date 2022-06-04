import * as PIXI from 'pixi.js';
import { Entity,System, RenderableSystem, Engine, GameEvent } from 'fosfeno';
import { SpriteComponent,PositionComponent,DynamicsComponent, AnimationsComponent, TextFromProperty, RenderDynamicsRotation, } from '../components';
import { RenderHelper } from './render';
import { AnimationHelper } from './animation';
import { EntityFactory, World } from '../state';


export class SkiRenderSystem extends System implements RenderableSystem {

    private player: Entity;
    private renderHelper: RenderHelper;
    private animationHelper: AnimationHelper;
    private subscriptions: [string, (event: GameEvent)=>void][];
    private touchPointerGraphics: PIXI.Graphics;

    constructor(engine: Engine, player: Entity) {
        super(engine);
        this.player = player;
        this.engine.pixiApp.renderer.backgroundColor = 0xFFFFFF;
        this.renderHelper = new RenderHelper( engine );
        this.animationHelper = new AnimationHelper( engine );
        this.subscriptions = [
            ['SpaceKeyPress', this.onSpaceKeyPress.bind(this)],
            ['SpaceKeyRelease', this.onSpaceKeyRelease.bind(this)],
            ['TouchStart', this.onSpaceKeyPress.bind(this)],
            ['TouchEnd', this.onSpaceKeyRelease.bind(this)],
            ['TouchMove', this.onTouchMove.bind(this)],
            ['TouchEnd', this.onTouchEnd.bind(this)],
            ['Fullscreen', this.onFullscreen.bind(this)],
            ['GoalReached', this.onGoalReached.bind(this)],
            ['DeleteEntity', this.onDeleteEntity.bind(this)],
            ['MouseDown', this.onMouseDown.bind(this)],
            ['MouseUp', this.onMouseUp.bind(this)],
        ];
        this.touchPointerGraphics = new PIXI.Graphics();
        this.touchPointerGraphics.zIndex = 100;
        engine.pixiApp.stage.addChild( this.touchPointerGraphics );
    }

    render(): void {
        this.renderHelper.updateVisibleObjects();

        let renderEntities = this.getEntitiesBySignature( [SpriteComponent, PositionComponent], [DynamicsComponent, RenderDynamicsRotation] );
        this.renderHelper.renderAll( renderEntities );
    }

    update(delta: number) {
        const animations = this.getEntitiesBySignature( [AnimationsComponent, SpriteComponent] );
        this.animationHelper.updateAnimations( animations );

        let texts = this.getEntitiesBySignature( [TextFromProperty, SpriteComponent] );
        this.renderHelper.updateTexts( texts );
    }

    stage(): void {
        this.subscribeToEvents( this.subscriptions );
        console.log( PIXI.utils.TextureCache)//['ski01.png'] )
    }
    
    unstage(): void {
        this.unsubscribeToEvents( this.subscriptions );
    }

    cleanup() {
        this.renderHelper.deleteNonVisible();
    }

    destroy() {
        let components = this.getComponentsOfClass( SpriteComponent );
        components.forEach(component => {
            (component as SpriteComponent).sprites.forEach(sprite => {
                sprite.destroy({
                    children: true,
                    texture: true,
                    baseTexture: true
                });
            });
        });
    }

    private onSpaceKeyPress() {
        this.togglePlayerSkiPole();
    }

    private onSpaceKeyRelease() {
        this.togglePlayerSkiPole();
    }

    private onMouseDown(event: GameEvent) {
        const button = event.msg.mouseEvent.button;
        if ( button === 0 ) {
            this.togglePlayerSkiPole();
        }
    }

    private onTouchMove(event: GameEvent) {
        const factory = EntityFactory.getInstance( this.engine );
        const world = World.getInstance( this.engine );
        const playerPos = world.toScreen(<PositionComponent> this.engine.entityManager.getEntityComponentOfClass( PositionComponent, factory.player ));
        const pointer = <PositionComponent> this.engine.entityManager.getEntityComponentOfClass( PositionComponent, factory.touchPointer );
        this.touchPointerGraphics.clear();
        this.touchPointerGraphics.lineStyle(3, 0xfdfd01);
        this.touchPointerGraphics.moveTo( playerPos.x, playerPos.y );
        this.touchPointerGraphics.lineTo( pointer.x, pointer.y );
    }

    private onTouchEnd(event: GameEvent) {
        this.touchPointerGraphics.clear();
    }

    private onMouseUp(event: GameEvent) {
        const button = event.msg.mouseEvent.button;
        if ( button === 0 ) {
            this.togglePlayerSkiPole();
        }
    }

    private togglePlayerSkiPole() {
        let playerSprite = <SpriteComponent> this.getEntityComponentOfClass(SpriteComponent, this.player);
        if ( playerSprite.current === 0 ) {
            playerSprite.current = 1;
        } else if ( playerSprite.current === 1 ) {
            playerSprite.current = 0;
        }
    }

    private onFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            this.engine.pixiApp.view.requestFullscreen();
        }
    }

    private onGoalReached() {
        let playerSprite = <SpriteComponent> this.getEntityComponentOfClass(SpriteComponent, this.player);
        playerSprite.current = 2;
    }

    private onDeleteEntity(event: GameEvent) {
        const sprite = <SpriteComponent> this.getEntityComponentOfClass( SpriteComponent, event.msg );
        if ( sprite ) sprite.sprites.forEach(s => { s.destroy( { children: true } ) });
    }
}


export class StartLevelRenderSystem extends System implements RenderableSystem {

    private renderHelper: RenderHelper;
    private animationHelper: AnimationHelper;

    constructor(engine: Engine) {
        super( engine );
        this.renderHelper = new RenderHelper( engine );
        this.animationHelper = new AnimationHelper( engine );
    }

    render(): void {
        let renderEntities = this.getEntitiesBySignature( [SpriteComponent, PositionComponent], [DynamicsComponent] );
        this.renderHelper.renderAll( renderEntities );
    }

    update(delta: number) {
        const animations = this.getEntitiesBySignature( [AnimationsComponent, SpriteComponent] );
        this.animationHelper.updateAnimations( animations );

        let texts = this.getEntitiesBySignature( [TextFromProperty, SpriteComponent] );
        this.renderHelper.updateTexts( texts );
    }

    stage(): void {
    }
    
    unstage(): void {
    }

    cleanup() {}

    destroy() {
    }
}


export class PauseRenderSystem extends System implements RenderableSystem {

    private renderHelper: RenderHelper;
    private animationHelper: AnimationHelper;

    constructor(engine: Engine) {
        super( engine );
        this.renderHelper = new RenderHelper( engine );
        this.animationHelper = new AnimationHelper( engine );
    }

    render(): void {
        let renderEntities = this.getEntitiesBySignature( [SpriteComponent, PositionComponent], [DynamicsComponent] );
        this.renderHelper.renderAll( renderEntities );
    }

    update(delta: number) {
        const animations = this.getEntitiesBySignature([AnimationsComponent, SpriteComponent]);
        this.animationHelper.updateAnimations( animations );
    }

    stage(): void {
        this.subscribeToEvents([
            ['Fullscreen', this.onFullscreen.bind(this)]
        ]);
    }
    
    unstage(): void {
        this.unsubscribeToEvent( 'Fullscreen', this.onFullscreen.bind(this) );
    }

    cleanup() {}

    destroy() {
    }

    private onFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            this.engine.pixiApp.view.requestFullscreen();
        }
    }
}