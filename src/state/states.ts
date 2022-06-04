import * as PIXI from 'pixi.js';
import { Entity, Engine, GameState, System } from 'fosfeno';
import { EntityFactory } from './factory';
import { World } from './world';
import { InputSystem, PauseInputSystem, PlayerDiedInputSystem } from '../input';
import { UISystem, SkiRenderSystem, StartLevelUISystem, StartLevelRenderSystem, PauseRenderSystem, Camera } from '../graphics';
import { MotionSystem, CollisionSystem } from '../physics';
import { HealthSystem, EntityDeleteSystem } from '../logic';
import { SpriteComponent } from '../components';


export class RandomLevelState extends GameState {

    private systems: System[];
    private factory: EntityFactory;
    private world: World;

    constructor(engine: Engine, loadResoures: boolean) {
        super(engine, loadResoures);
    }

    private createSystems() {
        this.systems = [
            new InputSystem( this.engine, this.factory.touchPointer ),
            new UISystem( this.engine ),
            new MotionSystem( this.engine, this.factory.player ),
            new CollisionSystem( this.engine, this.world.currentLevel.pixelWidth, this.world.currentLevel.pixelHeight ),
            new HealthSystem( this.engine, this.factory.player ),
            new SkiRenderSystem( this.engine, this.factory.player ),
            new EntityDeleteSystem( this.engine )
        ];
    }

    init(): void {
        this.factory = EntityFactory.getInstance( this.engine );
        this.world = World.getInstance( this.engine );
        this.createSystems();
    }

    getSystems(): System[] {
        return this.systems;
    }

    stage(): void {
    }

    unstage(): void {
    }

    destroy(): void {
        PIXI.Loader.shared.reset();
    }

}


export class StartLevelState extends GameState {

    //private levelDescription: string[];
    private factory: EntityFactory;
    private world: World;
    private systems: System[];
    readonly imageResources: string[];
    readonly soundResources: string[];

    constructor(engine: Engine, loadResoures: boolean) {
        super( engine, loadResoures );
        this.imageResources = [
            'img/texture.json'
        ];
        this.soundResources = [];
        this.setResourceUrls(this.imageResources, this.soundResources);
    }

    private createSystems() {
        this.systems = [
            new StartLevelUISystem( this.engine ),
            new StartLevelRenderSystem( this.engine ),
        ];
    }

    init(): void {
        this.world = World.getInstance( this.engine );
        this.world.createRandomLevel();
        
        this.factory = EntityFactory.getInstance( this.engine );
        this.factory.createPlayer( this.world.currentLevel.startCellX, this.world.currentLevel.startCellY );
        this.factory.createPauseButton();
        this.factory.createLevelText();
        this.factory.createHPText( this.factory.player );
        this.factory.createFlagsText()
        this.factory.createStatisticsText();
        this.factory.createTouchPointer();
        this.factory.createStartCounter();
        //this.factory.createGrid( this.world.currentLevel.pixelWidth, this.world.currentLevel.pixelHeight );
        
        this.createSystems();
    }

    getSystems(): System[] {
        return this.systems;
    }

    stage(): void {
    }

    update(delta: number): void {
    }

    cleanup(): void {
    }

    unstage(): void {
    }
    
    destroy(): void {
    }

}


export class PlayerDiedState extends GameState {

    private factory: EntityFactory;
    private systems: System[];
    private entities: Entity[];

    constructor(engine: Engine, loadResoures: boolean) {
        super( engine, loadResoures );
        this.factory = EntityFactory.getInstance( this.engine );
        this.entities = [];
    }

    private createSystems() {
        this.systems = [
            new PlayerDiedInputSystem( this.engine, this.factory.touchPointer ),
            new UISystem( this.engine ),
            new PauseRenderSystem( this.engine ),
        ];
    }

    init(): void {
        this.createSystems();
    }

    getSystems(): System[] {
        return this.systems;
    }

    stage(): void {
        this.entities.push( this.factory.createPauseScreen() );
        this.entities.push( this.factory.createLogoPlayerDied() );
        this.entities.push( this.factory.createRestartButton() );
    }

    update(delta: number): void {
    }

    cleanup(): void {
    }

    unstage(): void {
        this.entities.forEach(e => {
            const sprite = <SpriteComponent> this.engine.entityManager.getEntityComponentOfClass( SpriteComponent, e );
            sprite.sprites.forEach(s => { s.destroy() });
            this.engine.entityManager.removeEntity( e );
        });
    }
    
    destroy(): void {
    }

}


export class GoalReachedState extends GameState {

    private factory: EntityFactory;
    private systems: System[];
    private entities: Entity[];

    constructor(engine: Engine, loadResoures: boolean) {
        super( engine, loadResoures );
        this.factory = EntityFactory.getInstance( this.engine );
        this.entities = [];
        const world = World.getInstance( engine );
        world.increaseLevelNumber();
    }

    private createSystems() {
        this.systems = [
            new PlayerDiedInputSystem( this.engine, this.factory.touchPointer ),
            new UISystem( this.engine ),
            new PauseRenderSystem( this.engine ),
        ];
    }

    init(): void {
        console.log('init goal reach statte')
        this.createSystems();
        console.log('init done')
    }

    getSystems(): System[] {
        return this.systems;
    }

    stage(): void {
        console.log('stage goal reach state')
        this.entities.push( this.factory.createPauseScreen() );
        this.entities.push( this.factory.createLogoGoalReached() );
        this.entities.push( this.factory.createNextLevelButton() );
        console.log('stage done')
    }

    update(delta: number): void {
    }

    cleanup(): void {
    }

    unstage(): void {
        console.log('unstage goal reach state')
        this.entities.forEach(e => {
            const sprite = <SpriteComponent> this.engine.entityManager.getEntityComponentOfClass( SpriteComponent, e );
            sprite.sprites.forEach(s => { s.destroy() });
            this.engine.entityManager.removeEntity( e );
        });
        console.log('unstage done')
    }
    
    destroy(): void {
    }

}


export class PauseState extends GameState {

    private factory: EntityFactory;
    private systems: System[];
    private entities: Entity[];

    constructor(engine: Engine, loadResoures: boolean) {
        super( engine, loadResoures );
        this.factory = EntityFactory.getInstance( this.engine );
        this.entities = [];
    }

    private createSystems() {
        this.systems = [
            new PauseInputSystem( this.engine, this.factory.touchPointer ),
            new UISystem( this.engine ),
            new PauseRenderSystem( this.engine ),
        ];
    }

    init(): void {
        this.createSystems();
    }

    getSystems(): System[] {
        return this.systems;
    }

    stage(): void {
        this.entities.push( this.factory.createPauseScreen() );
        this.entities.push( this.factory.createLogo() );
        this.entities.push( this.factory.createResumeButton() );
        this.entities.push( this.factory.createRestartButton() );
        this.entities.push( this.factory.createFullscreenButton() );
    }

    update(delta: number): void {
    }

    cleanup(): void {
    }

    unstage(): void {
        this.entities.forEach(e => {
            const sprite = <SpriteComponent> this.engine.entityManager.getEntityComponentOfClass( SpriteComponent, e );
            sprite.sprites.forEach(s => { s.destroy() });
            this.engine.entityManager.removeEntity( e );
        });
    }
    
    destroy(): void {
    }

}
