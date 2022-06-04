import * as PIXI from 'pixi.js';
import { Entity, Engine, EntitySignature } from 'fosfeno';
import { EntityFactory, World } from '../state';
import { SpriteComponent, PositionComponent, DynamicsComponent, TextFromProperty, CoordinateType, RenderDynamicsRotation } from '../components';


const min = ( a: number, b: number ) => { return a < b ? a : b; };

const max = ( a: number, b: number ) => { return a > b ? a : b; };


export class RenderHelper {

    private engine: Engine;
    private visibleEntities: { row: number, entities: Entity[] }[];
    private visibleRows: { first: number, last: number };
    private entitiesToDelete: Entity[];
    private renderedGrid: Entity[][];
    private updateTimestamp: number;

    constructor(engine: Engine) {
        this.engine = engine;
        const world = World.getInstance( engine );
        this.visibleEntities = [];
        this.entitiesToDelete = [];
        this.renderedGrid = [];
        for ( let i = 0; i < world.currentLevel.gridHeight; i++ ) {
            this.renderedGrid[i] = [];
            for ( let j = 0; j < world.currentLevel.gridWidth; j++ ) {
                this.renderedGrid[i].push( undefined );
            }
        }
    }

    renderAll(renderEntities: EntitySignature) {
        const factory = EntityFactory.getInstance( this.engine );
        const world = World.getInstance( this.engine );
        renderEntities.forEach((entity: Entity, sprite: SpriteComponent, position: PositionComponent, dynamics: DynamicsComponent, renderDynamicsRotation: RenderDynamicsRotation) => {
            sprite.sprites.forEach(s => {
                s.visible = false;
                if (dynamics && renderDynamicsRotation) s.rotation = dynamics.angle - Math.PI / 2; // PIXI rotation angle is relative to 12 o'clock
            });
            const { x, y } = world.toScreen( position );
            if ( !sprite.sprites[sprite.current] ) console.log( entity, sprite );
            sprite.sprites[sprite.current].x = x;
            sprite.sprites[sprite.current].y = y;
            if ( sprite.alpha ) sprite.sprites.forEach( s => { s.alpha = sprite.alpha } );
            if ( sprite.height ) sprite.sprites.forEach( s => { s.height = sprite.height } );
            if ( sprite.rotation ) sprite.sprites.forEach( s => { s.rotation = sprite.rotation } );
            if ( sprite.scale ) sprite.sprites.forEach( s => { s.scale.x = sprite.scale; s.scale.y = sprite.scale; } );
            if ( sprite.tint ) sprite.sprites.forEach( s => { s.tint = sprite.tint } );
            if ( sprite.width ) sprite.sprites.forEach( s => { s.width = sprite.width } );
            sprite.sprites[sprite.current].visible = sprite.visible;
        });
    }

    updateTexts(texts: EntitySignature) {
        const now = Date.now();
        texts.forEach((entity: Entity, text: TextFromProperty, sprite: SpriteComponent) => {
            if ( !text.intervalTimestamp || now - text.intervalTimestamp > text.updateInterval ) {
                const formattedText = text.format ?
                    text.format( text.object[text.property] )
                    : text.object[text.property];
                text.text.text = text.prefix + formattedText + text.suffix;
                text.intervalTimestamp = now;
            }
        });
    }

    updateVisibleObjects() {
        let logok = false;
        const now = Date.now();
        if ( this.updateTimestamp === undefined || (this.updateTimestamp && now - this.updateTimestamp > 2000) ) {
            logok = true;
            this.updateTimestamp = now;
        }
        const log = (...args: any[]) => { if ( logok ) console.log(...args); };

        const world = World.getInstance( this.engine );
        const factory = EntityFactory.getInstance( this.engine );
        const level = world.currentLevel;
        const grid = level.grid;
        const currentVisibleRows = this.findVisibleRows();

        const addRow = (row: number) => {
            const entities = factory.createWorldRow( row, grid[row], world.activeFlags );
            return { row: row, entities: entities };
        };

        if ( this.visibleRows === undefined ) {
            // first time, generate all visible rows
            this.visibleRows = currentVisibleRows;
            for ( let row = currentVisibleRows.first; row <= currentVisibleRows.last; row++ ) {
                this.visibleEntities.push( addRow( row ) );
            }
        } else {
            // generate/delete only what has changed since last update
            // check top rows
            if ( currentVisibleRows.first > this.visibleRows.first ) {
                for ( let row = this.visibleRows.first; row < currentVisibleRows.first; row++ ) {
                    const r = this.visibleEntities.shift();
                    this.entitiesToDelete = this.entitiesToDelete.concat( r.entities );
                }
            } else if ( currentVisibleRows.first < this.visibleRows.first ) {
                for ( let row = currentVisibleRows.first; row < this.visibleRows.first; row++ ) {
                    this.visibleEntities.unshift( addRow( row ) );
                }
            }
            // check bottom rows
            if ( currentVisibleRows.last > this.visibleRows.last ) {
                for ( let row = this.visibleRows.last+1; row <= currentVisibleRows.last; row++ ) {
                    this.visibleEntities.push( addRow( row ) );
                }
            } else if ( currentVisibleRows.last < this.visibleRows.last ) {
                for ( let row = currentVisibleRows.last+1; row <= this.visibleRows.last; row++ ) {
                    const r = this.visibleEntities.pop();
                    this.entitiesToDelete = this.entitiesToDelete.concat( r.entities );
                }
            }

            this.visibleRows = currentVisibleRows;
        }
    }

    deleteNonVisible() {
        while ( this.entitiesToDelete.length > 0 ) {
            const entity = this.entitiesToDelete.shift();
            const sprite = <SpriteComponent> this.engine.entityManager.getEntityComponentOfClass( SpriteComponent, entity );
            if ( sprite ) {
                sprite.sprites.forEach(s => {
                    this.engine.pixiApp.stage.removeChild( s );
                    s.destroy({
                        children: true,
                        texture: false,
                        baseTexture: false
                    });
                });
            }
            this.engine.entityManager.removeEntity( entity );
        }
    }

    private findVisibleRows() {
        const world = World.getInstance( this.engine );
        const screenWidth = this.engine.pixiApp.renderer.width;
        const screenHeight = this.engine.pixiApp.renderer.height;
        const camera = new Camera( this.engine );
        const from = world.toGrid( camera );
        const to = world.toGrid({
            x: camera.x + screenWidth - 1,
            y: camera.y + screenHeight - 1,
            type: 'world'
        });

        return { first: from.y, last: to.y };
    }
}

export class Camera {

    private engine: Engine;

    public x: number;
    public y: number;
    public type: CoordinateType = 'world';

    constructor(engine: Engine) {
        this.engine = engine;
        this.update();
    }

    update() {
        const factory = EntityFactory.getInstance( this.engine );
        const world = World.getInstance( this.engine );
        const level = world.currentLevel;
        const player = factory.player;
        const playerPosition = <PositionComponent> this.engine.entityManager.getEntityComponentOfClass( PositionComponent, player );
        const screenWidth = this.engine.pixiApp.renderer.width / this.engine.pixiApp.renderer.resolution;
        const screenHeight = this.engine.pixiApp.renderer.height / this.engine.pixiApp.renderer.resolution;
        this.x = min( level.pixelWidth  - screenWidth,  max( 0, playerPosition.x - screenWidth/2 ) );
        this.y = min( level.pixelHeight - screenHeight, max( 0, playerPosition.y - screenHeight/3 ) );
    }
}