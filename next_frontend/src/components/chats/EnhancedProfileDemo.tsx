import React, { useState } from "react";
import EnhancedProfileList from "./EnhancedProfileList";

// Sample data based on your provided structure
const sampleProfiles = [
  {
    "id": "56f22646-0f91-4ad1-913d-c66a44bd7fca",
    "first_name": "Samarth",
    "last_name": "Bagga",
    "headline": "SDE Intern @Meesho | GSoC '25 Mentor @Sugarlabs | GSoC '24 @Sugarlabs",
    "company": "Meesho",
    "position": "Software Development Intern",
    "location": "Bengaluru, Karnataka, India",
    "linkedin_url": "https://www.linkedin.com/in/samarth-bagga-175453226",
    "profile_photo_url": "https://media.licdn.com/dms/image/v2/D5603AQGFa6i2sG4S8A/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1732079140043?e=1759363200&v=beta&t=X4kJUlVEi-BZ3aVKqWO8GWrPVVLiS3BoTFr4fB8NZ9U",
    "all_quotes": ["Software Development Intern", "SDE Intern", "GSoC Mentor"],
    "yes_score": {
      "confidence": 30,
      "quotes": ["Software Development Intern", "SDE Intern"],
      "matching_traits": ["Is a software engineer"]
    },
    "maybe_score": {
      "confidence": 0,
      "quotes": [],
      "matching_traits": []
    },
    "no_score": {
      "confidence": 95,
      "quotes": ["Bengaluru, Karnataka, India"],
      "matching_traits": ["Is based in Delhi"]
    },
    "mutual_connection": "a5ee6e12-5c5b-4912-9207-8529ecdb8575"
  },
  {
    "id": "08bd1d8d-d299-457f-9d85-34745f05e8c9",
    "first_name": "Shaik",
    "last_name": "Vali Basha",
    "headline": "Associate Software Engineer @ INFOR | JNTUGV - IT'24",
    "company": "Infor",
    "position": "Associate Software Engineer",
    "location": "Hyderābād, Telangana, India",
    "linkedin_url": "https://www.linkedin.com/in/vali-basha28",
    "profile_photo_url": "https://media.licdn.com/dms/image/v2/D5603AQHZZZeP-B_f9A/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1729145192262?e=1759363200&v=beta&t=GyUOk7A78EJhGR0ZuDyDkuvDazVP3MovxJG4D8I-2Ss",
    "all_quotes": ["Associate Software Engineer", "JNTUGV - IT'24"],
    "yes_score": {
      "confidence": 40,
      "quotes": ["Associate Software Engineer"],
      "matching_traits": ["Is a software engineer"]
    },
    "maybe_score": {
      "confidence": 0,
      "quotes": [],
      "matching_traits": []
    },
    "no_score": {
      "confidence": 95,
      "quotes": ["Hyderābād, Telangana, India"],
      "matching_traits": ["Is based in Delhi"]
    },
    "mutual_connection": "a5ee6e12-5c5b-4912-9207-8529ecdb8575"
  },
  {
    "id": "5f94ffc9-9a86-49e5-9ad0-3e1a4f8768ef",
    "first_name": "Sarthak",
    "last_name": "Aggarwal",
    "headline": "Student at University School of Automation & Robotics, GGSIPU",
    "company": "Agile Group",
    "position": "Cyber Security intern",
    "location": "New Delhi, Delhi, India",
    "linkedin_url": "https://www.linkedin.com/in/sarthakagg",
    "profile_photo_url": "https://media.licdn.com/dms/image/v2/D4E03AQHNM2gL8Cw6rA/profile-displayphoto-shrink_800_800/B4EZVZBv1PHgAc-/0/1740955385673?e=1759363200&v=beta&t=L6GG4IioKVARhk71MVbyNfKXFozF5fbvhIyQvMUCR8w",
    "all_quotes": ["Cyber Security intern", "Student at University School of Automation & Robotics"],
    "yes_score": {
      "confidence": 50,
      "quotes": ["New Delhi, Delhi, India"],
      "matching_traits": ["Is based in Delhi"]
    },
    "maybe_score": {
      "confidence": 70,
      "quotes": ["Student pursuing technology degree"],
      "matching_traits": ["Has technical background"]
    },
    "no_score": {
      "confidence": 60,
      "quotes": ["Cyber Security intern", "Student at University School of Automation & Robotics, GGSIPU"],
      "matching_traits": ["Is a software engineer"]
    },
    "mutual_connection": "a5ee6e12-5c5b-4912-9207-8529ecdb8575"
  },
  {
    "id": "b662cc95-6071-436b-916e-b7b4beaf61c3",
    "first_name": "Swastik",
    "last_name": "Vaish",
    "headline": "Associate Data Scientist @ Proeffico Solutions | 6x Hackathon Winner | 3 Research Papers (CV, CN+ML, Robotics) | 2 Patent Filed (CV)",
    "company": "Proeffico Solutions Private Ltd.",
    "position": "Associate Data Scientist",
    "location": "New Delhi, Delhi, India",
    "linkedin_url": "https://www.linkedin.com/in/swastikvaish",
    "profile_photo_url": "https://media.licdn.com/dms/image/v2/D5603AQGZkU8ufTjwCg/profile-displayphoto-crop_800_800/B56Zj7aY_nIAAQ-/0/1756564656893?e=1759363200&v=beta&t=DFdBX1AuHLtKPcTjh8OXAlC6l79oWZm5O_QzwO-bG30",
    "all_quotes": ["Associate Data Scientist", "6x Hackathon Winner", "3 Research Papers", "2 Patent Filed", "Computer Vision Engineer"],
    "yes_score": {
      "confidence": 85,
      "quotes": ["New Delhi, Delhi, India", "Software Development Intern"],
      "matching_traits": ["Is based in Delhi", "Is a software engineer"]
    },
    "maybe_score": {
      "confidence": 60,
      "quotes": ["Associate Data Scientist", "Computer Vision Engineer"],
      "matching_traits": ["Is a software engineer"]
    },
    "no_score": {
      "confidence": 0,
      "quotes": [],
      "matching_traits": []
    },
    "mutual_connection": "a5ee6e12-5c5b-4912-9207-8529ecdb8575"
  },
  {
    "id": "7f23fa60-9f7a-45c9-82dc-8bfda0c99653",
    "first_name": "Adarsh",
    "last_name": "Kumar",
    "headline": "IT Consultant & Software Developer",
    "company": "Cisco",
    "position": "Project Engineer",
    "location": "India",
    "linkedin_url": "https://www.linkedin.com/in/adarshthefirst",
    "profile_photo_url": "https://media.licdn.com/dms/image/v2/D5603AQEq-6MyXpqqgA/profile-displayphoto-crop_800_800/B56Zjsb2NFG4AI-/0/1756313382375?e=1759363200&v=beta&t=nxm_4qenW2C678Z5jkkv--bOgYM4T98ZTFBiJsCYYZg",
    "all_quotes": ["IT Consultant & Software Developer", "Project Engineer", "Software Engineer"],
    "yes_score": {
      "confidence": 50,
      "quotes": ["Software Engineer", "IT Consultant & Software Developer"],
      "matching_traits": ["Is a software engineer"]
    },
    "maybe_score": {
      "confidence": 75,
      "quotes": ["India"],
      "matching_traits": ["Is based in Delhi"]
    },
    "no_score": {
      "confidence": 0,
      "quotes": [],
      "matching_traits": []
    },
    "mutual_connection": "a5ee6e12-5c5b-4912-9207-8529ecdb8575"
  }
];

const EnhancedProfileDemo: React.FC = () => {
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  const handleProfileSelect = (profile: any) => {
    setSelectedProfile(profile);
    console.log("Selected profile:", profile);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Enhanced Profile Search Results
        </h1>
        <p className="text-gray-600">
          Demo of the new enhanced profile display with scoring, LinkedIn photos, quotes, and mutual connections.
        </p>
      </div>

      <EnhancedProfileList
        profiles={sampleProfiles}
        title="Software Engineers in Delhi"
        onProfileSelect={handleProfileSelect}
      />

      {selectedProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Profile Details</h2>
              <button
                onClick={() => setSelectedProfile(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(selectedProfile, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedProfileDemo;
