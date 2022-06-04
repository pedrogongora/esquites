
export class Level {

    public levelDescription: string[];
    public gridWidth: number;
    public gridHeight: number;
    public pixelWidth: number;
    public pixelHeight: number;
    public startCellX: number;
    public startCellY: number;
    public finishCellX: number;
    public finishCellY: number;
    public grid: string[][];
    public bearNum: number;
    public flagNum: number;

    constructor(levelDescription: string[]) {
        this.levelDescription = levelDescription;

        let max = 0, min = 0, x = 0;
        for (let row of levelDescription) {
            if (row[0] === '(') x -= 1;
            if (row[0] === ')') x += 1;
            max = max > x ? max : x;
            min = min < x ? min : x;
        }

        const blockSize = 10; // the grid is divided in blocks of 10x10 cells
        const cellSize = 64; // grid cells are 64x64 pixels
        
        const startX = Math.abs(min);
        const startY = 0;
        const finishX = Math.abs(min) + x;
        const finishY = levelDescription.length + 1;
        const blockCols = Math.abs(min) + max + 1;
        const blockRows = levelDescription.length + 2;
        const rows = blockRows * blockSize;
        const cols = blockCols * blockSize;
        const flagStart = 2;
        const flagFinish = 7;

        this.gridWidth = blockCols * blockSize;
        this.gridHeight = blockRows * blockSize;
        this.pixelWidth = this.gridWidth * cellSize;
        this.pixelHeight = this.gridHeight * cellSize;
        this.startCellX = startX * blockSize + Math.floor(blockSize / 2);
        this.startCellY = Math.floor(blockSize / 2);
        this.finishCellX = finishX * blockSize + Math.floor(blockSize / 2);
        this.finishCellY = finishY * blockSize + Math.floor(blockSize / 2);
        this.grid = [];
        this.bearNum = 0;
        this.flagNum = 0;

        // init grid
        for ( let i=0; i<rows; i++ ) {
            this.grid[i] = [];
            for ( let j=0; j<cols; j++ ) {
                this.grid[i].push( '' );
            }
        }

        // fill with random trees
        const numTrees = Math.floor( 0.7 * rows * cols );
        for ( let i = 0; i < numTrees; i++ ) {
            const row = Math.floor( rows * Math.random() );
            const col = Math.floor( cols * Math.random() );
            this.grid[row][col] = 'T';
        }

        let row = 0;
        let next = row + blockSize;
        let col = startX * blockSize;

        // setup start block
        while ( row < next ) {
            for ( let i = 0; i < blockSize; i++ ) {
                this.grid[row][col + i] = '';
            }
            row++;
        }

        // clear the road with blanks
        for ( let roadPiece of levelDescription ) {
            const bear = roadPiece.length > 1 && roadPiece[1] === 'B';
            const bearRoadCol = Math.round( Math.random() ) === 0 ? 0 : blockSize - 1;
            next = row + blockSize;
            while ( row < next ) {
                for ( let i = 0; i < blockSize; i++ ) {
                    if ( row === next - blockSize/2 && (i === flagStart || i === flagFinish) ) {
                        // is flag?
                        if ( i === flagStart) {
                            this.grid[row][col + i] = 'F_'+this.flagNum;
                            if ( i === flagStart ) {
                                this.flagNum++;
                            }
                        } else {
                            this.grid[row][col + i] = 'f_'+(this.flagNum-1);
                        }
                    } else if ( row === next - blockSize && i === bearRoadCol ) {
                        //is bear?
                        if ( bear ) {
                            this.grid[row][col + i] = 'B';
                            this.bearNum++;
                        }
                    } else {
                        //blank otherwise
                        this.grid[row][col + i] = '';
                    }
                }
                if ( roadPiece[0] === '(') {
                    col--;
                } else if ( roadPiece[0] === ')') {
                    col++;
                }
                row++;
            }
        }

        // setup finish block
        next = row + blockSize;
        while ( row < next ) {
            for ( let i = 0; i < blockSize; i++ ) {
                if ( row === next - blockSize/2 && (i === flagStart || i === flagFinish) ) {
                    this.grid[row][col + i] = 'G';
                } else {
                    this.grid[row][col + i] = '';
                }
            }
            row++;
        }
        console.log( 'finish grid:\n' + this.toString() );
    }

    public toString() {
        let s = `(${this.gridWidth} x ${this.gridHeight}) (${this.pixelWidth}px x ${this.pixelHeight}px)\n`;
        s = s + '      '
        for (let col=0;col<this.grid[0].length; col++) s = s + (col % 10);
        s = s + "\n"
        for (let row=0;row<this.grid.length; row++) {
            if ( row < 10 ) s = s + '0';
            if ( row < 100 ) s = s + '0';
            s = s + row + ': |';
            for(let col=0; col<this.grid[row].length; col++) {
                s = s + (this.grid[row][col] !== '' ? this.grid[row][col][0] : ' ' );
            }
            s = s + '|\n';
        }
        return s;
    }

}


export class LevelDescriptions  {

    static getRandomLevel(difficulty: number): string[] {
        console.log('gen level, difficulty: ' + difficulty)
        let r: string[] = [];
        const rand = (min: number, max: number) => { return Math.floor( Math.random() * (max - min) + min )};
        const randPath = () => { const r = rand(0, 2); return r === 0 ? '(' : r === 1 ? ')' : '|'; };
        const randB = () => { return rand(0, Math.floor(50/difficulty)) === 0 ? 'B' : ''; };
        const length = difficulty * 2 + 3;
        for (let i = 0; i < length; i++) {
            r.push( randPath() + randB() );
        }
        console.log('gen level, ', r)
        return r;
    }
}