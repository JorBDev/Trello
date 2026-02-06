# 🚀 Trello Automation Suite

## 📋 Descripción General

**Trello Automation Suite** es un sistema de automatización desarrollado para un cliente freelance que gestiona **30+ tableros de Trello con 500+ tarjetas activas**. El cliente necesitaba analizar diariamente el estado de múltiples proyectos, una tarea que le tomaba **4 horas manuales cada día**.

Esta herramienta **reduce ese tiempo a 15 minutos**, extrayendo automáticamente datos de la API de Trello, aplicando reglas de negocio complejas y generando reportes CSV listos para análisis.

### 🎯 Problema que Resuelve

Mi cliente, como Project Manager, debía:
- ✅ Revisar 30+ tableros manualmente cada día
- ✅ Identificar tareas atrasadas (2+, 3+, 15+ días)
- ✅ Categorizar tareas por estado y tipo
- ✅ Generar reportes para su equipo
- ⏱️ **Total: 4 horas/día de trabajo repetitivo**

### ✨ Solución

Script automatizado que:
- 🔄 Extrae datos de todos los tableros vía API Trello
- 🧠 Aplica 19 reglas de negocio configurables
- 📊 Genera 19 reportes CSV específicos
- ⚡ **Tiempo de ejecución: 15 minutos**
- 💰 **Ahorro: ~80 horas/mes para el cliente**

---

## ✨ Características Principales

### 🔥 Core Features

- **Extracción masiva de datos de Trello**
  - Tableros, listas, tarjetas, campos personalizados, acciones
  - Manejo de rate limits (300 req/10s)
  - Sistema multi-token para maximizar throughput

- **Procesamiento inteligente**
  - 19 "dashcards" configurables (reglas de filtrado)
  - Validaciones temporales: "this week", "this month", "earlier than X days"
  - Filtrado por status personalizados

- **Generación de reportes**
  - Archivos JSON intermedios
  - Exportación a CSV con delimitadores personalizados
  - Organización automática por categoría

### 🎨 Dashcards Soportadas (ejemplos)

- **CSS Still Due**: Tareas pendientes de Customer Success
- **15+ Days Uncompleted**: Tareas antiguas sin completar
- **Stale Cancels**: Cancelaciones del mes actual
- **Support Done**: Tickets de soporte completados
- Y 15 más...

---

## 🛠️ Tecnologías Utilizadas

- **Runtime:** Node.js 18+ (ES Modules)
- **Lenguaje:** JavaScript (ES6+)
- **HTTP Client:** Axios 1.12.2
- **Data Export:** json2csv 6.0.0
- **Config:** dotenv 16.4.5
- **API:** Trello REST API v1

### Por qué estas tecnologías:

- ✅ **Node.js**: Ideal para scripting, excelente manejo de async/await
- ✅ **Axios**: Retry logic y manejo de errores superior al fetch nativo
- ✅ **json2csv**: Configuración avanzada de CSV (delimitadores personalizados)

---

## 📋 Prerrequisitos

- Node.js 18+
- Cuenta de Trello con acceso API
- API Key y Token de Trello ([obtener aquí](https://trello.com/power-ups/admin))

---

## 🔧 Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone [https://github.com/JorBDev/Trello.git](https://github.com/JorBDev/Trello.git)
cd Trello

### 2. Instalar dependencias

```bash
pnpm install
# o
npm install

### 3. Configurar variables de entorno

```bash
cp .env.example .env

# Editar .env con tus credenciales

### 4. Ejecutar el script

# Modo interactivo
node Consultas.js

# o batch
./run-script.bat