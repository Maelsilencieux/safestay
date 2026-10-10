interface dts {
    id :String,
    onclose:any
}

const Validmodal: React.FC<dts> = ({id , onclose}) => {

    
    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"> 

         <div className="flex bg-white rounded-md"> 
            
        </div>

        </div>
    )
}