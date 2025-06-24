from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from uuid import uuid4
from typing import List, Optional, Dict, Literal


# PUBLIC_INTERFACE


class StartGameResponse(BaseModel):
    """Response model for starting a new game."""

    game_id: str = Field(
        ...,
        description="The unique ID of the started game."
    )
    board: List[List[Optional[str]]] = Field(
        ...,
        description="The current game board state (3x3 grid, values: X, O, or None)."
    )
    current_player: Literal["X", "O"] = Field(
        ...,
        description="Player whose turn it is."
    )
    status: str = Field(
        ...,
        description="Current status - in_progress, win, draw."
    )


# PUBLIC_INTERFACE


class MakeMoveRequest(BaseModel):
    """Model for making a move in a game."""

    row: int = Field(..., description="Row (0-2)")
    col: int = Field(..., description="Column (0-2)")
    player: Literal["X", "O"] = Field(..., description="The player making the move")


# PUBLIC_INTERFACE


class MakeMoveResponse(BaseModel):
    """Response model for making a move."""

    board: List[List[Optional[str]]] = Field(
        ...,
        description="The updated game board state."
    )
    current_player: Optional[Literal["X", "O"]] = Field(
        ...,
        description="Next player or None if game ended."
    )
    status: str = Field(
        ...,
        description="Current status (in_progress, win, draw)."
    )
    winner: Optional[Literal["X", "O"]] = Field(
        None,
        description="Winner if game over."
    )


# PUBLIC_INTERFACE


class GameStateResponse(BaseModel):
    """Response model for retrieving game state."""

    board: List[List[Optional[str]]]
    current_player: Optional[Literal["X", "O"]]
    status: str
    winner: Optional[Literal["X", "O"]]


app = FastAPI(
    title="Tic Tac Toe Backend API",
    description="Backend logic and state management for Tic Tac Toe game.",
    version="1.0.0",
    openapi_tags=[
        {
            "name": "Game",
            "description": "Endpoints for game session management and move operations."
        }
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for games
games: Dict[str, dict] = {}

#######################
# Game Logic
#######################


# PUBLIC_INTERFACE


def create_new_game() -> dict:
    """Create and return a new game state."""
    return {
        "board": [[None, None, None] for _ in range(3)],
        "current_player": "X",
        "status": "in_progress",  # can be: in_progress, win, draw
        "winner": None,
        "move_count": 0,
    }


# PUBLIC_INTERFACE


def check_win(board: List[List[Optional[str]]]) -> Optional[str]:
    """Check board for winner. Returns 'X', 'O', or None."""
    # Check rows and columns
    for i in range(3):
        if (
            board[i][0] == board[i][1] == board[i][2]
            and board[i][0] is not None
        ):
            return board[i][0]
        if (
            board[0][i] == board[1][i] == board[2][i]
            and board[0][i] is not None
        ):
            return board[0][i]
    # Check diagonals
    if (
        board[0][0] == board[1][1] == board[2][2]
        and board[0][0] is not None
    ):
        return board[0][0]
    if (
        board[0][2] == board[1][1] == board[2][0]
        and board[0][2] is not None
    ):
        return board[0][2]
    return None


# PUBLIC_INTERFACE


def check_draw(move_count: int, status: str) -> bool:
    """Returns True if game is draw."""
    return move_count == 9 and status == "in_progress"


#######################
# API Endpoints
#######################


# PUBLIC_INTERFACE


@app.post(
    "/game/start",
    response_model=StartGameResponse,
    tags=["Game"],
    summary="Start a new game",
    description="Creates a new Tic Tac Toe game session and returns the initial state."
)
def start_game():
    """
    Starts a new Tic Tac Toe game session.
    Returns a new game ID and the initial board state.
    """
    game_id = str(uuid4())
    games[game_id] = create_new_game()
    gs = games[game_id]
    return StartGameResponse(
        game_id=game_id,
        board=gs["board"],
        current_player=gs["current_player"],
        status=gs["status"],
    )


# PUBLIC_INTERFACE


@app.post(
    "/game/{game_id}/move",
    response_model=MakeMoveResponse,
    tags=["Game"],
    summary="Make a move",
    description="Submit a move for a player in an existing game."
)
def make_move(game_id: str, move: MakeMoveRequest):
    """
    Makes a move for a player, updates the game state, and checks for win/draw.
    Returns the updated game state, next player, and status.
    """
    if game_id not in games:
        raise HTTPException(404, "Game not found.")
    gs = games[game_id]

    if gs["status"] != "in_progress":
        raise HTTPException(400, "Game already finished.")

    if not (0 <= move.row < 3 and 0 <= move.col < 3):
        raise HTTPException(400, "Invalid board position.")

    if gs["board"][move.row][move.col] is not None:
        raise HTTPException(400, "Cell is already filled.")

    if move.player != gs["current_player"]:
        raise HTTPException(400, "It is not this player's turn.")

    gs["board"][move.row][move.col] = move.player
    gs["move_count"] += 1

    winner = check_win(gs["board"])
    if winner:
        gs["status"] = "win"
        gs["winner"] = winner
        return MakeMoveResponse(
            board=gs["board"],
            current_player=None,
            status="win",
            winner=winner
        )

    if check_draw(gs["move_count"], gs["status"]):
        gs["status"] = "draw"
        return MakeMoveResponse(
            board=gs["board"],
            current_player=None,
            status="draw",
            winner=None
        )

    # Switch turn
    gs["current_player"] = "O" if gs["current_player"] == "X" else "X"
    return MakeMoveResponse(
        board=gs["board"],
        current_player=gs["current_player"],
        status="in_progress",
        winner=None
    )


# PUBLIC_INTERFACE


@app.get(
    "/game/{game_id}/state",
    response_model=GameStateResponse,
    tags=["Game"],
    summary="Get game state",
    description="Retrieves current state of a specific game."
)
def get_game_state(game_id: str):
    """
    Returns the current state of the game (board, current player, status, winner).
    """
    if game_id not in games:
        raise HTTPException(404, "Game not found.")
    gs = games[game_id]
    return GameStateResponse(
        board=gs["board"],
        current_player=(
            gs["current_player"] if gs["status"] == "in_progress" else None
        ),
        status=gs["status"],
        winner=gs["winner"],
    )


# Health check


@app.get("/", summary="Health check")
def health_check():
    """Returns basic health status."""
    return {"message": "Healthy"}
