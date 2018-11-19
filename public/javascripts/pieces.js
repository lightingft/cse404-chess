function Piece()
{
	// Piece position
	this.x = 0;
	this.y = 0;
	
	// Piece state
	this.isAlive = true;
	// we only have a boolean here because there's only 2 players
	this.isWhite = false;
	
	// Gets valid moves for the piece (placeholder)
	this.getValidMoves = function() { return []; }
}

var coordinatesToCell = function (x, y)
{
	return (String.fromCharCode(x+65)+""+(y+1));
}

function Pawn()
{
	Piece.call(this);
	
	// Keep track if it's the first move for the Pawn
	this.firstMove = true;
	
	this.getValidMoves = function() {
		// We igonre the base case here because if a pawn reaches
		// the end of the board, then it is no longer a pawn.
		var moves = [];

		// Offset: if piece is white, then the offset is 1.
		var offset = 1;

		// If the piece is black, then the offset is -1
		if (!this.isWhite)
			offset = -1;
	
		// Valid move would be 1 forward
		moves.push(coordinatesToCell(this.x, this.y+offset));

		// If it's the first move for the pawn, then moving 2 forward
		// is also a valid move
		if (this.firstMove)
		{
			moves.push(coordinatesToCell(this.x, this.y+2*offset));
		}

		// Return moves array
		return moves;
	}
}

// Prototype redirecting
Pawn.prototype = Object.create(Piece.prototype);
Pawn.prototype.constructor = Pawn;

function Bishop()
{
	
}

function King()
{
	
}