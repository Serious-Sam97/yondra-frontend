import {useEffect, useState} from 'react'

interface CardEditProps {
    goBack: () => void
    submit: (card: any, isNew: boolean) => void
    card: any | null
}

const CardEdit: React.FC<CardEditProps> = ({goBack, submit, card}) => {
    const [id, setId] = useState(0)
    const [name, setName] = useState<string>('')
    const [description, setDescription] = useState<string>('')
    const [sectionId, setSectionId] = useState(1)

    useEffect(() => {
        if(card !== null) {
            setId(card.id)
            setName(card.name)
            setDescription(card.description)
            setSectionId(card.section_id)
        }
    }, [])

    const handleSubmit = () => {
        submit({
            id,
            name,
            description,
            section_id: sectionId
        }, card === null)
    }

    return (
        <div className='flex flex-col justify-between h-full'>
            <div>
                <div className='flex flex-col pb-10'>
                    <label className='text-gray-700 font-bold'>Ticket Name</label>
                    <input placeholder='Title Name' className='text-5xl text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300' type='text' value={name} onChange={(event) => setName(event.target.value)}/>
                </div>

                <div className='flex flex-col'>
                    <label className='text-gray-700 font-bold'>Description</label>
                    <textarea
                        rows={8}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Enter description..."
                        className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none text-black"
                    />
                </div>
            </div>

            <div className='flex justify-between'>
                <button onClick={goBack} className="px-5 py-2.5 text-sm font-medium bg-white hover:bg-gray-300 border-black rounded-lg focus:ring-4 focus:ring-gray-400 transition-colors duration-200 cursor-pointer">
                    <p className='text-black'>Cancel</p>
                </button>
                <button onClick={handleSubmit} className="px-5 py-2.5 text-sm font-medium bg-amber-600 hover:bg-amber-700 focus:ring-4 focus:ring-amber-800 rounded-lg transition-colors duration-200 cursor-pointer">
                    <p className='text-white'>Save</p>
                </button>
            </div>
        </div>
    ) 
}

export default CardEdit
