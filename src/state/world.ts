import { Engine, GameEvent } from 'fosfeno';
import { PositionComponent } from '../components';
import { Level, LevelDescriptions } from './levels';
import { Camera } from '../graphics'


export class World {

    private static instance: World;
    private engine: Engine;
    private _currentLevel: Level;
    private _currentLevelNumber: number;
    public activeFlags: boolean[];

    private constructor(engine: Engine) {
        this.engine = engine;
        this._currentLevelNumber = 1;
        //engine.eventQueue.subscribe( 'NextLevel', this.onNextLevel.bind(this) );
    }

    static getInstance(engine: Engine) {
        if ( this.instance === undefined ) {
            this.instance = new World( engine );
        }
        return this.instance;
    }

    createRandomLevel() {
        const description = LevelDescriptions.getRandomLevel( this._currentLevelNumber );
        this._currentLevel = new Level( description );
        this.activeFlags = [];
        for ( let i=0; i<this._currentLevel.flagNum; i++ ) this.activeFlags.push( false );
        return this._currentLevel;
    }

    get currentLevel() {
        return this._currentLevel;
    }

    get currentLevelNumber() {
        return this._currentLevelNumber;
    }

    increaseLevelNumber() {
        this._currentLevelNumber++;
    }

    toWorld(position: PositionComponent): PositionComponent {
        const camera = new Camera( this.engine );
        const screenWidth= this.engine.pixiApp.renderer.width;
        const screenHeight = this.engine.pixiApp.renderer.height;

        if ( position.type === 'world') {
            return { 
                x: position.x, 
                y: position.y,
                type: 'world'
            }
        } else if ( position.type === 'screen') {
            return { 
                x: position.x < 0 ? screenWidth + position.x + camera.x : position.x + camera.x, 
                y: position.y < 0 ? screenHeight + position.y + camera.y : position.y + camera.y,
                type: 'world'
            }
        } else if ( position.type === 'ratio') {
            return { 
                x: position.x * screenWidth + camera.x, 
                y: position.y * screenHeight + camera.y,
                type: 'world'
            }
        }
    }

    toScreen(position: PositionComponent): PositionComponent {
        const camera = new Camera( this.engine );
        const resolution = this.engine.pixiApp.renderer.resolution;
        const screenWidth= this.engine.pixiApp.renderer.width / resolution;
        const screenHeight = this.engine.pixiApp.renderer.height / resolution;

        if ( position.type === 'world') {
            return { 
                x: position.x - camera.x, 
                y: position.y - camera.y,
                type: 'screen'
            }
        } else if ( position.type === 'screen') {
            return { 
                x: position.x < 0 ? screenWidth + position.x : position.x, 
                y: position.y < 0 ? screenHeight + position.y : position.y,
                type: 'screen'
            }
        } else if ( position.type === 'ratio') {
            return { 
                x: Math.floor( position.x ) === position.x ? position.x : position.x * screenWidth, 
                y: Math.floor( position.y ) === position.y ? position.y : position.y * screenHeight,
                type: 'screen'
            }
        }
    }

    toGrid(position: PositionComponent): PositionComponent {
        const worldPosition = position.type === 'world' ? position : this.toWorld( position );

        return {
            x: Math.floor( worldPosition.x / 64 ),
            y: Math.floor( worldPosition.y / 64 ),
            type: 'grid'
        }
    }

    private onNextLevel(event: GameEvent) {
        this._currentLevelNumber++;
    }

}