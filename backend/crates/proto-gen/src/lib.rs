pub mod common {
    tonic::include_proto!("common");
}

pub mod auth {
    tonic::include_proto!("auth");
}

pub mod store {
    tonic::include_proto!("store");
}

pub mod inventory {
    tonic::include_proto!("inventory");
}

pub mod category {
    tonic::include_proto!("category");
}

pub mod product {
    tonic::include_proto!("product");
}

pub mod table {
    tonic::include_proto!("table");
}

pub mod order {
    tonic::include_proto!("order");
}

pub mod payment {
    tonic::include_proto!("payment");
}

pub mod report {
    tonic::include_proto!("report");
}

pub mod status {
    tonic::include_proto!("status");
}

pub mod customer {
    tonic::include_proto!("customer");
}

pub mod branch {
    tonic::include_proto!("branch");
}

pub mod ingredient {
    tonic::include_proto!("ingredient");
}

pub mod recipe {
    tonic::include_proto!("recipe");
}

pub mod procurement {
    tonic::include_proto!("procurement");
}

pub mod billing {
    tonic::include_proto!("billing");
}

pub mod table_cart {
    tonic::include_proto!("table_cart");
}

pub const FILE_DESCRIPTOR_SET: &[u8] = tonic::include_file_descriptor_set!("kioskflow_descriptor");
