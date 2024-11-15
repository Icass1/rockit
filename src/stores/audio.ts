import { map, atom } from 'nanostores';

const songSrc = atom();

console.log("ASDFASDFASFDASDF")
const audio = new Audio()

songSrc.subscribe((value) => {

    console.log(value)
    if (value?.id) {
        console.log(value.id)
        audio.src = `/api/song/${value.id}`
    }
})

export { songSrc }