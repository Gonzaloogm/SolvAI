import os
import subprocess
from openai import OpenAI

client = OpenAI(
  base_url = "https://integrate.api.nvidia.com/v1",
  api_key = os.environ["NVIDIA_API_KEY"]
)

def get_code_from_nvidia_nim(prompt: str) -> str:
    # Asegurarnos de que el modelo responda únicamente con código de Python
    prompt_with_instructions = prompt + "\n\nResponde SOLAMENTE con el código en Python, sin comillas invertidas de markdown, ni texto adicional."
    
    completion = client.chat.completions.create(
      model="minimaxai/minimax-m2.7",
      messages=[{"role":"user","content":prompt_with_instructions}],
      temperature=1,
      top_p=0.95,
      max_tokens=8192,
      stream=False
    )
    code = completion.choices[0].message.content
    
    # Limpiamos bloques de código markdown por si acaso el modelo los incluye
    if "```python" in code:
        code = code.split("```python")[1].split("```")[0]
    elif "```" in code:
        code = code.split("```")[1].split("```")[0]
        
    return code.strip()

def run_code_in_sandbox(code: str):
    try:
        # Ejecución controlada del código
        result = subprocess.run(
            ['python3', '-c', code], 
            capture_output=True, 
            text=True, 
            timeout=5
        )
        if result.returncode != 0:
            return {"status": "error", "output": result.stderr}
        return {"status": "success", "output": result.stdout}
    except Exception as e:
        return {"status": "error", "output": str(e)}

# El agente decide si el código pasa a producción o necesita un re-intento
def agent_decision_loop(prompt):
    print("Generando código...")
    code = get_code_from_nvidia_nim(prompt) # Tu llamada a la API
    print("Código generado:\n" + code + "\n")
    
    print("Ejecutando en entorno seguro...")
    execution = run_code_in_sandbox(code)
    
    if execution["status"] == "error":
        print(f"Error de ejecución: {execution['output']}")
        print("Solicitando corrección a NVIDIA NIM...")
        # Llama a la API de nuevo para que lo corrija, y lo vuelve a ejecutar.
        # Retorna el nuevo código generado, o bien puedes llamar de nuevo a run_code_in_sandbox.
        fixed_code = get_code_from_nvidia_nim(f"Corrige este error: {execution['output']} en este código: {code}")
        print("Código corregido generado:\n" + fixed_code + "\n")
        fixed_execution = run_code_in_sandbox(fixed_code)
        
        if fixed_execution["status"] == "error":
            return {"status": "error", "output": fixed_execution["output"]}
        else:
            return {"status": "success", "output": fixed_execution["output"]}
            
    return {"status": "success", "output": execution["output"]}

if __name__ == "__main__":
    test_prompt = "Escribe un bucle for que imprima los números del 1 al 5."
    print("Iniciando flujo...")
    resultado = agent_decision_loop(test_prompt)
    print("\nResultado final del agente:", resultado)
