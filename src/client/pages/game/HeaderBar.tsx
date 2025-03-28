import headerBarCSS from "./HeaderBar.module.css";

type HeaderBarProps = {
    time: number | undefined
    wordLength: number | undefined
}

function HeaderBar({ time, wordLength }: HeaderBarProps) {
    return (
        <div className={headerBarCSS["header"]}>
            <div className={headerBarCSS["timer"]}>{time?time:'🕒'}</div>
            <h1 id="word-bar">{wordLength?"_ ".repeat(wordLength):"word to guess goes here"}</h1>
        </div>
    )
}

export { HeaderBar };
