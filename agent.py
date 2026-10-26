import os
import json
import subprocess
from openai import OpenAI

# Configuración del cliente usando NVIDIA NIM
API_KEY = os.environ["NVIDIA_API_KEY"]
MODEL = "meta/llama-3.1-405b-instruct"

client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=API_KEY
)

# Definición de las herramientas (Tools)
tools = [
    {
        "type": "function",
        "function": {
            "name": "execute_bash",
            "description": "Ejecuta un comando en la terminal bash y devuelve la salida. Usa esto para ejecutar scripts, instalar dependencias, listar archivos, etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "El comando de bash a ejecutar."
                    }
                },
                "required": ["command"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Lee y devuelve el contenido de un archivo local.",
            "parameters": {
                "type": "object",
                "properties": {
                    "filepath": {
                        "type": "string",
                        "description": "Ruta absoluta o relativa del archivo a leer."
                    }
                },
                "required": ["filepath"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Escribe contenido en un archivo local (sobrescribe si existe).",
            "parameters": {
                "type": "object",
                "properties": {
                    "filepath": {
                        "type": "string",
                        "description": "Ruta del archivo a escribir."
                    },
                    "content": {
                        "type": "string",
                        "description": "Contenido a escribir en el archivo."
                    }
                },
                "required": ["filepath", "content"]
            }
        }
    }
]

# Implementación de las herramientas
def execute_bash(command: str) -> str:
    print(f"\n[⚠️  ATENCIÓN] El agente quiere ejecutar el comando:\n$ {command}")
    confirm = input("¿Permitir ejecución? (y/n): ").strip().lower()
    if confirm != 'y':
        return "Ejecución cancelada por el usuario."
    
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30)
        output = result.stdout
        if result.stderr:
            output += f"\nSTDERR:\n{result.stderr}"
        return output if output else "Comando ejecutado con éxito (sin salida)."
    except Exception as e:
        return f"Error al ejecutar: {str(e)}"

def read_file(filepath: str) -> str:
    print(f"\n[🔍] El agente está leyendo: {filepath}")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"Error leyendo el archivo: {str(e)}"

def write_file(filepath: str, content: str) -> str:
    print(f"\n[⚠️  ATENCIÓN] El agente quiere escribir en: {filepath}")
    print(f"Vista previa de los primeros 100 caracteres:\n{content[:100]}...\n")
    confirm = input("¿Permitir escritura? (y/n): ").strip().lower()
    if confirm != 'y':
        return "Escritura cancelada por el usuario."
    
    try:
        # Crea los directorios si no existen
        os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return "Archivo escrito correctamente."
    except Exception as e:
        return f"Error escribiendo el archivo: {str(e)}"

# Despachador de llamadas a funciones
def call_tool(function_name: str, args: dict) -> str:
    if function_name == "execute_bash":
        return execute_bash(args.get("command"))
    elif function_name == "read_file":
        return read_file(args.get("filepath"))
    elif function_name == "write_file":
        return write_file(args.get("filepath"), args.get("content"))
    else:
        return f"Herramienta desconocida: {function_name}"

# Bucle principal del asistente
def main():
    print("=========================================================")
    print(f"🤖 Agente de Terminal (Modelo: {MODEL})")
    print(" Escribe 'salir' o 'exit' para terminar.")
    print("=========================================================\n")
    
    system_prompt = (
        "Eres un ingeniero de software autónomo operando en la terminal del usuario. "
        "Tienes acceso a herramientas para ejecutar comandos bash, leer archivos y escribir archivos. "
        "Usa las herramientas siempre que sea necesario para explorar el entorno, ejecutar pruebas o crear archivos. "
        "Razona paso a paso."
    )
    
    messages = [
        {"role": "system", "content": system_prompt}
    ]
    
    while True:
        try:
            user_input = input("\nTú: ")
            if user_input.strip().lower() in ['salir', 'exit', 'quit']:
                print("¡Hasta luego!")
                break
            if not user_input.strip():
                continue
            
            messages.append({"role": "user", "content": user_input})
            
            # Bucle de llamadas a herramientas
            while True:
                response = client.chat.completions.create(
                    model=MODEL,
                    messages=messages,
                    tools=tools,
                    tool_choice="auto",
                    temperature=0.2,
                    max_tokens=2048,
                )
                
                response_message = response.choices[0].message
                messages.append(response_message)
                
                # Si el modelo decidió llamar a una herramienta
                if response_message.tool_calls:
                    for tool_call in response_message.tool_calls:
                        func_name = tool_call.function.name
                        try:
                            args = json.loads(tool_call.function.arguments)
                        except json.JSONDecodeError:
                            args = {}
                            
                        print(f"\n[⚙️] Herramienta invocada: {func_name}")
                        tool_result = call_tool(func_name, args)
                        
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "name": func_name,
                            "content": tool_result
                        })
                    
                    # Vuelve a llamar al modelo con el resultado de las herramientas
                    continue
                else:
                    # Respuesta final al usuario
                    if response_message.content:
                        print(f"\nAgente:\n{response_message.content}")
                    break
                    
        except KeyboardInterrupt:
            print("\n¡Interrumpido por el usuario! Hasta luego.")
            break
        except Exception as e:
            print(f"\n[Error inesperado]: {str(e)}")

if __name__ == "__main__":
    main()
