import * as PIXI from 'pixi.js';
import { Entity,System, Engine, GameEvent, AudioManager } from 'fosfeno';


export class SoundSystem extends System {

    private audio: AudioManager;
    private player: Entity;

    constructor(engine: Engine, audio: AudioManager, player: Entity) {
        super(engine);
        this.audio = audio;
        this.player = player;
    }

    onPlayerDied(event: GameEvent) {
        //this.audio.sounds['splat'].once('end', ()=>{ this.audio.sounds['meow'].play() }).play();
    }

    onEnemyDied(event: GameEvent) {
        this.audio.play('splat');
    }

    onTeleport(event: GameEvent) {
        this.audio.play('beep');
    }

    update(delta: number) {}

    stage(): void {
    }
    
    unstage(): void {
    }

    cleanup() {}

    destroy() {}
}