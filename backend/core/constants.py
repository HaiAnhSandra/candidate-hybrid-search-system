RELATED_SKILLS_MAP = {
    # Backend
    "Java": ["Spring Boot", "Hibernate", "Maven", "Gradle", "JUnit", "MyBatis"],
    "Python": ["Django", "FastAPI", "Flask", "SQLAlchemy", "Celery", "pytest"],
    "Go": ["gRPC", "REST API", "PostgreSQL", "Docker", "Gin"],
    "Node.js": ["Express.js", "NestJS", "TypeScript", "JavaScript", "Prisma"],
    "C#": [".NET", "ASP.NET", "Entity Framework", "Azure", "LINQ"],
    "PHP": ["Laravel", "Symfony", "MySQL", "Composer", "REST API"],
    "Ruby": ["Rails", "RSpec", "PostgreSQL", "Sidekiq"],
    "Rust": ["Tokio", "Actix", "WebAssembly", "gRPC"],
    "Kotlin": ["Spring Boot", "Ktor", "Coroutines", "JVM", "Gradle"],
    "Scala": ["Akka", "Play Framework", "Spark", "SBT", "Kafka"],
    # Frontend
    "React": ["Next.js", "Redux", "TypeScript", "JavaScript", "Tailwind CSS"],
    "Vue.js": ["Nuxt.js", "Vuex", "Pinia", "TypeScript", "JavaScript"],
    "Angular": ["TypeScript", "RxJS", "JavaScript", "NgRx"],
    "TypeScript": ["JavaScript", "React", "Node.js", "Angular", "Vue.js"],
    "JavaScript": ["TypeScript", "React", "Node.js", "Vue.js", "Angular"],
    # Mobile
    "Flutter": ["Dart", "GetX", "Bloc", "Firebase", "SQLite"],
    "React Native": ["TypeScript", "Expo", "Firebase", "Redux", "JavaScript"],
    "Swift": ["iOS", "Xcode", "UIKit", "SwiftUI", "CoreData"],
    "Kotlin Android": [
        "Android",
        "Jetpack Compose",
        "Room",
        "Retrofit",
        "Gradle"
    ],
    # Data & ML
    "Machine Learning": [
        "PyTorch",
        "TensorFlow",
        "scikit-learn",
        "Pandas",
        "MLflow"
    ],
    "Data Engineering": ["Apache Spark", "Airflow", "dbt", "Kafka", "Hadoop"],
    "Apache Spark": ["PySpark", "Hadoop", "Hive", "Airflow", "Scala"],
    "PyTorch": ["Python", "TensorFlow", "scikit-learn", "CUDA", "Pandas"],
    "TensorFlow": ["Python", "Keras", "PyTorch", "scikit-learn", "CUDA"],
    # DevOps & Cloud
    "DevOps": ["Docker", "Kubernetes", "Terraform", "Jenkins", "GitHub Actions"],
    "Kubernetes": ["Docker", "Helm", "Terraform", "ArgoCD", "Prometheus"],
    "Docker": ["Kubernetes", "Docker Compose", "CI/CD", "Linux", "Terraform"],
    "AWS": ["EC2", "S3", "Lambda", "RDS", "EKS", "CloudFormation"],
    "GCP": ["BigQuery", "Cloud Run", "GKE", "Pub/Sub", "Terraform"],
    "Azure": [
        "AKS",
        "Azure Functions",
        "CosmosDB",
        "DevOps",
        "Terraform"
    ],
    "Terraform": ["AWS", "GCP", "Azure", "Kubernetes", "Ansible"],
    "CI/CD": ["Jenkins", "GitHub Actions", "GitLab CI", "ArgoCD", "Docker"],
    # Database
    "PostgreSQL": ["SQL", "pgvector", "Redis", "SQLAlchemy", "Docker"],
    "MySQL": ["SQL", "PostgreSQL", "Redis", "Hibernate", "Docker"],
    "MongoDB": ["NoSQL", "Mongoose", "Redis", "Node.js", "Docker"],
    "Redis": ["Caching", "Kafka", "Docker", "PostgreSQL", "Node.js"],
    "Kafka": ["Redis", "RabbitMQ", "Spark", "Kubernetes", "Java"],
    # QA
    "Selenium": ["Java", "Python", "TestNG", "JUnit", "Cucumber"],
    "Cypress": ["JavaScript", "TypeScript", "React", "REST API"],
    "Jest": ["JavaScript", "TypeScript", "React", "Node.js"]
}


def expand_related_skills(skills: list[str]) -> list[str]:
    related = []
    for skill in skills:
        related.extend(RELATED_SKILLS_MAP.get(skill, []))
    return list(set(related))
