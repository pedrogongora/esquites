import { Entity } from "fosfeno";

export interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}


export class Quadtree {

    readonly maxValues: 10;
    readonly maxLevels = 5;

    level: number;
    bounds: Box;
    values: { entity: Entity, box: Box }[];
    children: Quadtree[];

    constructor(level: number, bounds: Box) {
        this.level = level;
        this.bounds = bounds;
        this.values = [];
        this.children = [undefined, undefined, undefined, undefined];
    }

    insert(entity: Entity, box: Box) {
        if (this.children[0] != undefined) {
            let index = this.getIndex(box);
            if (index != -1) {
                this.children[index].insert(entity, box);
                return;
            }
        }

        this.values.push({ entity: entity, box: box });

        if (this.values.length > this.maxValues && this.level < this.maxLevels) {
            if (this.children[0] == undefined) {
                this.split();
            }
            let i = 0;
            while (i < this.values.length) {
                let index = this.getIndex(this.values[i].box);
                if (index != -1) {
                    this.children[index].insert(entity, box);
                } else {
                    i++;
                }
            }
        }
    }

    retreive(box: Box, acc: { entity: Entity, box: Box }[]) {
        let index = this.getIndex(box);
        let res = [];
        if (index != -1 && this.children[0] != undefined) {
            res = this.children[index].retreive(box, acc);
        }

        res = acc.concat(this.values);
        
        return res;
    }

    split() {
        const wmid = Math.floor( this.bounds.w / 2 );
        const hmid = Math.floor( this.bounds.h / 2 );
        const x = this.bounds.x;
        const y = this.bounds.y;
        const l = this.level + 1;
        this.children[0] = new Quadtree(l, { x: x + wmid, y: y, w: wmid, h: hmid });
        this.children[1] = new Quadtree(l, { x: x, y: y, w: wmid, h: hmid });
        this.children[2] = new Quadtree(l, { x: x, y: y + hmid, w: wmid, h: hmid });
        this.children[3] = new Quadtree(l, { x: x + wmid, y: y + hmid, w: wmid, h: hmid });
    }

    getIndex(box: Box): number {
        let index = -1;
        const xmid = this.bounds.x + this.bounds.w / 2;
        const ymid = this.bounds.y + this.bounds.h / 2;
        const top = box.y < ymid && box.y + box.w < ymid;
        const bot = box.y > ymid;
        const left = box.x < xmid && box.x + box.w < xmid;
        if (left) {
            if (top) {
                index = 1;
            } else if (bot) {
                index = 2;
            }
        } else {
            if (top) {
                index = 0;
            } else if (bot) {
                index = 3;
            }
        }
        return index;
    }

    clear() {
        if (this.children[0] != undefined) {
            for (let i=0; i<4; i++) {
                this.children[i].clear();
            }
        }
        this.values = [];
        this.children = [undefined, undefined, undefined, undefined];
    }
}